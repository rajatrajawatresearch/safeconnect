"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { PersonaAvatar } from "@/components/layout/user-menu";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DISTRICTS, STATIONS, stationById } from "@/data/demo/geo";
import { useAction } from "@/hooks/use-action";
import { useSession } from "@/hooks/use-session";
import { initialsOf } from "@/lib/format";
import { uid } from "@/lib/prng";
import { services } from "@/services";
import { useDemoStore } from "@/stores/demo-store";
import type { Role, RoleKey, StaffUser } from "@/types";
import { SCOPE_META, isStaffRole } from "./admin-meta";
import { FormField, Spinner } from "./admin-ui";

const NO_POSTING = "none";

/** A posting is stored as a station or a district; the form carries it as one tagged value. */
const postingValue = (user: Pick<StaffUser, "stationId" | "districtId">) =>
  user.stationId
    ? `s:${user.stationId}`
    : user.districtId
      ? `d:${user.districtId}`
      : NO_POSTING;

function buildSchema(roles: Role[], takenEmails: string[]) {
  return z
    .object({
      name: z
        .string()
        .trim()
        .min(2, "Enter the person's full name.")
        .max(80, "Keep the name under 80 characters."),
      email: z
        .string()
        .trim()
        .toLowerCase()
        .pipe(z.email("Enter a valid work email address.")),
      role: z.string().min(1, "Choose a role."),
      posting: z.string().min(1, "Choose a posting."),
    })
    .superRefine((value, ctx) => {
      const role = roles.find((r) => r.key === value.role);
      if (!role || !isStaffRole(role.key)) {
        if (value.role)
          ctx.addIssue({
            code: "custom",
            path: ["role"],
            message: "Choose a staff role.",
          });
      } else if (
        (role.scope === "station" || role.scope === "assigned") &&
        !value.posting.startsWith("s:")
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["posting"],
          message: `A ${role.name.toLowerCase()} must be posted to a police station.`,
        });
      } else if (role.scope === "district" && value.posting === NO_POSTING) {
        ctx.addIssue({
          code: "custom",
          path: ["posting"],
          message: `${role.name} needs a district or a station.`,
        });
      }
      if (takenEmails.includes(value.email))
        ctx.addIssue({
          code: "custom",
          path: ["email"],
          message: "A user with this email already exists.",
        });
    });
}

type FormValues = z.infer<ReturnType<typeof buildSchema>>;

/** Invite a new staff user, or change the role and posting of an existing one. */
export function UserDialog({
  user,
  onClose,
}: {
  /** Omit to invite a new user. */
  user?: StaffUser;
  onClose: () => void;
}) {
  const { actor } = useSession();
  const roles = useDemoStore((s) => s.roles);
  const staff = useDemoStore((s) => s.staff);
  const staffRoles = useMemo(
    () => roles.filter((r) => isStaffRole(r.key)),
    [roles],
  );
  const schema = useMemo(
    () =>
      buildSchema(
        roles,
        staff
          .filter((u) => u.id !== user?.id && u.email)
          .map((u) => (u.email as string).toLowerCase()),
      ),
    [roles, staff, user?.id],
  );

  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: user?.name ?? "",
      email: user?.email ?? "",
      role: user?.role ?? "",
      posting: user ? postingValue(user) : NO_POSTING,
    },
  });
  const roleKey = useWatch({ control, name: "role" });
  const selectedRole = staffRoles.find((r) => r.key === roleKey);
  // Nobody raises or lowers their own access; a second administrator has to do it.
  const isSelf = user?.id === actor.id;

  const save = useAction(services.admin.upsertUser, {
    success: user ? "User updated" : "User invited",
    onSuccess: onClose,
  });

  const submit = (values: FormValues) => {
    const role = staffRoles.find((r) => r.key === values.role);
    if (!role) return;
    const station = values.posting.startsWith("s:")
      ? stationById(values.posting.slice(2))
      : undefined;
    const posting = {
      stationId: station?.id,
      districtId:
        station?.districtId ??
        (values.posting.startsWith("d:") ? values.posting.slice(2) : undefined),
    };
    const next: StaffUser = user
      ? {
          ...user,
          ...posting,
          role: role.key,
          title: role.key === user.role ? user.title : role.name,
        }
      : {
          id: uid("stf"),
          name: values.name,
          email: values.email,
          initials: initialsOf(values.name),
          role: role.key as RoleKey,
          badgeNo: "",
          rank: "Not recorded",
          title: role.name,
          ...posting,
          status: "invited",
          mfaEnabled: false,
          lastActiveAt: Date.now(),
        };
    void save.run(next, actor);
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {user ? "Edit role and posting" : "Invite user"}
          </DialogTitle>
          <DialogDescription>
            {user
              ? "Access changes as soon as you save. The change is written to the audit log."
              : "The person is added with the status Invited and no second factor. No email is sent from this prototype."}
          </DialogDescription>
        </DialogHeader>

        <form
          noValidate
          className="grid grid-cols-1 gap-4"
          onSubmit={(event) => void handleSubmit(submit)(event)}
        >
          {user ? (
            <div className="flex items-center gap-3 rounded-xl border border-border bg-inset p-3">
              <PersonaAvatar initials={user.initials} className="size-9" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{user.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {user.email ?? "No email on record"}
                </p>
              </div>
            </div>
          ) : (
            <>
              <FormField
                label="Full name"
                htmlFor="user-name"
                error={errors.name?.message}
              >
                <Input
                  id="user-name"
                  autoComplete="off"
                  placeholder="As it should appear in the consoles"
                  aria-invalid={Boolean(errors.name)}
                  aria-describedby={errors.name ? "user-name-error" : undefined}
                  className="h-9"
                  {...register("name")}
                />
              </FormField>
              <FormField
                label="Work email"
                htmlFor="user-email"
                error={errors.email?.message}
              >
                <Input
                  id="user-email"
                  type="email"
                  inputMode="email"
                  autoComplete="off"
                  placeholder="name@department.example"
                  aria-invalid={Boolean(errors.email)}
                  aria-describedby={
                    errors.email ? "user-email-error" : undefined
                  }
                  className="h-9"
                  {...register("email")}
                />
              </FormField>
            </>
          )}

          <FormField
            label="Role"
            htmlFor="user-role"
            error={errors.role?.message}
            hint={
              isSelf
                ? "You cannot change your own role. Another administrator has to."
                : selectedRole
                  ? `${selectedRole.description} Scope: ${SCOPE_META[selectedRole.scope].label.toLowerCase()}.`
                  : "The role decides everything this person can see and do."
            }
          >
            <Controller
              control={control}
              name="role"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={isSelf}
                >
                  <SelectTrigger
                    id="user-role"
                    ref={field.ref}
                    onBlur={field.onBlur}
                    aria-invalid={Boolean(errors.role)}
                    aria-describedby={
                      errors.role ? "user-role-error" : "user-role-hint"
                    }
                    className="w-full data-[size=default]:h-9"
                  >
                    <SelectValue placeholder="Choose a role" />
                  </SelectTrigger>
                  <SelectContent position="popper" align="start">
                    {staffRoles.map((role) => (
                      <SelectItem key={role.key} value={role.key}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>

          <FormField
            label="Station or district"
            htmlFor="user-posting"
            error={errors.posting?.message}
            hint="Sets which records the role's scope applies to."
          >
            <Controller
              control={control}
              name="posting"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger
                    id="user-posting"
                    ref={field.ref}
                    onBlur={field.onBlur}
                    aria-invalid={Boolean(errors.posting)}
                    aria-describedby={
                      errors.posting
                        ? "user-posting-error"
                        : "user-posting-hint"
                    }
                    className="w-full data-[size=default]:h-9"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent
                    position="popper"
                    align="start"
                    className="max-h-72"
                  >
                    <SelectGroup>
                      <SelectItem value={NO_POSTING}>
                        No posting (platform or state level)
                      </SelectItem>
                    </SelectGroup>
                    <SelectGroup>
                      <SelectLabel>District or commissionerate</SelectLabel>
                      {DISTRICTS.map((district) => (
                        <SelectItem
                          key={district.id}
                          value={`d:${district.id}`}
                        >
                          {district.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                    <SelectGroup>
                      <SelectLabel>Police station</SelectLabel>
                      {STATIONS.map((station) => (
                        <SelectItem key={station.id} value={`s:${station.id}`}>
                          {station.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" size="lg">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" size="lg" disabled={save.pending}>
              {save.pending && <Spinner />}
              {user ? "Save changes" : "Invite user"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
