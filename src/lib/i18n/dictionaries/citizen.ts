/**
 * Citizen app strings. Owned by the citizen feature: add keys here (English first, then gu and hi).
 * `{name}`-style placeholders are filled by `t(key, { name })`.
 */
const en = {
  "citizen.greeting.morning": "Good morning, {name}",
  "citizen.greeting.afternoon": "Good afternoon, {name}",
  "citizen.greeting.evening": "Good evening, {name}",
  "citizen.safetyStatus": "Safety status",
  "citizen.safetyStatus.normal": "Normal",
  "citizen.safetyStatus.active": "Emergency active",
  "citizen.emergency.title": "Emergency?",
  "citizen.emergency.body":
    "Hold the button for 3 seconds. Your location is sent to the control room.",
  "citizen.sos.hold": "Hold for SOS",
  "citizen.sos.holdHint": "Press and hold for 3 seconds",
  "citizen.sos.keepHolding": "Keep holding",
  "citizen.sos.release": "Release to cancel",
  "citizen.sos.activated": "SOS activated",
  "citizen.sos.active": "Emergency active",
  "citizen.sos.coordinating": "Help is being coordinated",
  "citizen.sos.queued": "Emergency request queued",
  "citizen.sos.queuedBody":
    "You are offline. We will send it the moment a connection is available. If you can, call 112.",
  "citizen.sos.viewActive": "Open active emergency",
  "citizen.sos.step.sent": "SOS sent",
  "citizen.sos.step.connected": "Control room connected",
  "citizen.sos.step.operator": "Operator assigned",
  "citizen.sos.step.unit": "Police unit assigned",
  "citizen.sos.step.enRoute": "Responder en route",
  "citizen.sos.step.arrived": "Responder arrived",
  "citizen.sos.operator": "Operator",
  "citizen.sos.responder": "Responder",
  "citizen.sos.eta": "ETA",
  "citizen.sos.liveStatus": "Live status",
  "citizen.sos.voice": "Voice",
  "citizen.sos.video": "Video",
  "citizen.sos.chat": "Chat",
  "citizen.sos.shareMedia": "Share media",
  "citizen.sos.trustedContact": "Trusted contact",
  "citizen.sos.silentMode": "Silent mode",
  "citizen.sos.iAmSafe": "I am safe",
  "citizen.sos.cancel": "Cancel SOS",
  "citizen.sos.cancelTitle": "End this emergency?",
  "citizen.sos.cancelBody":
    "Tell the control room why, so they know you are safe.",
  "citizen.quick.police": "Police help",
  "citizen.quick.medical": "Medical",
  "citizen.quick.fire": "Fire",
  "citizen.quick.women": "Women safety",
  "citizen.quick.child": "Child safety",
  "citizen.quick.report": "Report incident",
  "citizen.section.journey": "Journey safety",
  "citizen.section.report": "Report something",
  "citizen.section.complaints": "My complaints",
  "citizen.section.nearby": "Nearby help",
  "citizen.section.contacts": "Emergency contacts",
  "citizen.section.safetyCenter": "Safety centre",
  "citizen.locationShared": "Location shared with responders",
  "citizen.locationNotShared": "Location is not being shared",
  "citizen.privacy.emergencySharing":
    "When Emergency Location Sharing is enabled, your location may be shared with authorized responders during an active emergency.",

  // Home
  "citizen.emergency.bodyNoLocation":
    "Hold the button for 3 seconds. Live location is off, so only your saved area is sent.",
  "citizen.home.cannotHold": "Cannot hold? Confirm in two taps",
  "citizen.home.confirmTitle": "Send an SOS now?",
  "citizen.home.confirmBody":
    "The control room is alerted straight away with your name and location.",
  "citizen.home.confirmAction": "Send SOS",
  "citizen.home.silent": "Silent SOS",
  "citizen.home.silentTitle": "Send a silent SOS?",
  "citizen.home.silentBody":
    "The control room is alerted and replies by chat only. This screen stays dim and makes no sound. Nothing is recorded.",
  "citizen.home.silentAction": "Send silent SOS",
  "citizen.home.silentActive": "Silent SOS active",
  "citizen.home.activeBody":
    "Help is being coordinated. Open it to see live status and talk to the control room.",
  "citizen.home.sending": "Sending…",
  "citizen.home.quickTitle": "Need a specific kind of help?",
  "citizen.home.quickHint":
    "Each one asks you to confirm before anything is sent.",
  "citizen.home.toolsTitle": "Safety tools",
  "citizen.home.journeyDesc": "Share a trip with people you trust",
  "citizen.home.reportDesc":
    "Tell the police about something that is not an emergency",
  "citizen.home.complaintsDesc": "Track what you have reported",
  "citizen.home.nearbyDesc": "Police stations, hospitals and fire stations",
  "citizen.home.contactsDesc": "People told when you raise an SOS",
  "citizen.home.safetyDesc": "What to do in common situations",
  "citizen.home.openCount": "{count} open",
  "citizen.home.contactsCount": "{count} saved",

  // Quick help
  "citizen.quick.sheetTitle": "{kind}: confirm request",
  "citizen.quick.policeBody":
    "Raises an emergency for a police unit to come to you.",
  "citizen.quick.medicalBody":
    "Raises a medical emergency. The control room arranges ambulance help and sends the nearest unit.",
  "citizen.quick.fireBody":
    "Raises a fire emergency. The control room alerts the fire service and sends the nearest unit.",
  "citizen.quick.womenBody":
    "Raises a women's safety emergency. A women's help unit is sent where one is available.",
  "citizen.quick.childBody":
    "Raises an emergency for a child who is lost, hurt or at risk.",
  "citizen.quick.willSend": "What will be sent",
  "citizen.quick.sendLocation": "Your location now: {place}",
  "citizen.quick.sendArea": "Your saved area only: {place}",
  "citizen.quick.sendIdentity": "Your name and a masked phone number",
  "citizen.quick.sendKind": "Type of help: {kind}, marked critical",
  "citizen.quick.sendContacts": "Trusted contacts told: {names}",
  "citizen.quick.noteLabel": "Add a few words (optional)",
  "citizen.quick.notePlaceholder": "What is happening?",
  "citizen.quick.send": "Send request",
  "citizen.quick.demoNote":
    "This is a demonstration. Nothing reaches real emergency services. In a real emergency, call 112.",

  // SOS: before it is raised
  "citizen.sos.whatHappens": "What happens when you hold",
  "citizen.sos.what1": "Your name and location go to the control room.",
  "citizen.sos.what1Off":
    "Your name and saved area go to the control room. Live location stays off.",
  "citizen.sos.what2": "An operator stays with you by chat, voice or video.",
  "citizen.sos.what3": "The nearest available police unit is sent to you.",
  "citizen.sos.sharingOn": "Emergency location sharing is on",
  "citizen.sos.sharingOff": "Emergency location sharing is off",
  "citizen.sos.sharingOffBody":
    "Responders will get your saved area, not where you are right now.",
  "citizen.sos.openPrivacy": "Open privacy centre",
  "citizen.sos.kbdHint": "With a keyboard, hold Space or Enter for 3 seconds.",
  "citizen.sos.alreadyActive": "You already have an active emergency",
  "citizen.sos.contactsWillTell": "{names} will be told when you raise an SOS.",
  "citizen.sos.contactsNoneShort": "No trusted contact is set to be told",
  "citizen.sos.contactsOffShort": "Emergency contacts are switched off",

  // SOS: raised with no connection
  "citizen.sos.fallback": "Attempting emergency fallback",
  "citizen.sos.queuedDetail":
    "Nothing has been sent yet. Your request is saved on this phone and goes to the control room the moment a connection returns.",
  "citizen.sos.queuedNoSms":
    "No SMS or phone call has been made for you. The app keeps trying the connection.",
  "citizen.sos.call112": "If you can, call 112",
  "citizen.sos.cancelRequest": "Cancel request",
  "citizen.sos.queuedSaved": "Saved on this phone",
  "citizen.sos.waiting": "Waiting to send",
  "citizen.sos.connection": "Connection",
  "citizen.sos.queuedLocation": "Location captured when you raised it",
  "citizen.sos.queuedArea": "Your saved area will be sent",
  "citizen.sos.whileWaiting": "While you wait",
  "citizen.sos.whileWaiting1":
    "Move towards people and light if you can do so safely.",
  "citizen.sos.whileWaiting2":
    "Try a phone call to 112 or to someone you trust.",
  "citizen.sos.whileWaiting3":
    "Keep this screen open. The request sends itself as soon as it can.",
  "citizen.sos.queuedDemoHint":
    "In this demo the connection is set from the demo menu in the top banner.",

  // SOS: in progress
  "citizen.sos.onTheWay": "Help is on the way",
  "citizen.sos.helpArrived": "Help has arrived",
  "citizen.sos.incidentId": "Incident ID",
  "citizen.sos.raisedAt": "Raised at",
  "citizen.sos.kind": "Type",
  "citizen.sos.connecting": "Connecting…",
  "citizen.sos.controlRoom": "Control room",
  "citizen.sos.unit": "Unit {callSign}",
  "citizen.sos.responderPending": "Not assigned yet",
  "citizen.sos.findingUnit": "Finding the nearest unit",
  "citizen.sos.etaAbout": "About {min} min",
  "citizen.sos.etaEstimate": "Estimate. The unit has not set off yet.",
  "citizen.sos.etaLive": "Counting down as the unit travels",
  "citizen.sos.etaPending": "A time appears once a unit is assigned.",
  "citizen.sos.arrived": "Arrived",
  "citizen.sos.arriving": "Arriving",
  "citizen.sos.areaShared": "Saved area shared, not live location",
  "citizen.sos.mapLabel": "Map of your location and the responding unit",
  "citizen.sos.more": "More options",
  "citizen.sos.chatTitle": "Chat with the control room",
  "citizen.sos.chatWith": "{name} is with you",
  "citizen.sos.chatPlaceholder": "Write to the control room…",
  "citizen.sos.reply.safeForNow": "I am safe for now",
  "citizen.sos.reply.stillHere": "They are still here",
  "citizen.sos.reply.cannotTalk": "I cannot talk",
  "citizen.sos.reply.moved": "I have moved",
  "citizen.sos.worseToast":
    "The control room has been told it is getting worse",
  "citizen.sos.sessionVoice": "Voice session with the control room",
  "citizen.sos.sessionVideo": "Video session with the control room",
  "citizen.sos.sessionNote":
    "Simulated session. The camera and microphone are not used in this demonstration.",
  "citizen.sos.shareMediaBody":
    "Send a photo, a video or an audio clip to the control room. It is attached to this emergency.",
  "citizen.sos.shareMediaHint": "Photo, video or audio",
  "citizen.sos.shared": "Shared so far",
  "citizen.sos.sharedCount": "{count} shared with the control room",
  "citizen.sos.nothingShared": "Nothing shared yet.",
  "citizen.sos.mediaSent": "Sent to the control room",
  "citizen.sos.contactsNotified":
    "These contacts were told when you raised this SOS.",
  "citizen.sos.contactsQueued":
    "These contacts will be told once the request is sent.",
  "citizen.sos.contactsNone":
    "No trusted contact is set to be told about an SOS. You can add one now.",
  "citizen.sos.contactsOff":
    "Emergency contacts are switched off in your privacy settings, so nobody was told.",
  "citizen.sos.contactsTold": "{names} told",
  "citizen.sos.contactTold": "Told",
  "citizen.sos.contactWaiting": "Waiting",
  "citizen.sos.contactsDemo":
    "In this demonstration no SMS or call is placed. The app only marks these contacts as told.",
  "citizen.sos.manageContacts": "Manage contacts",
  "citizen.sos.silentModeBody":
    "Dims this screen and hides voice and video. It does not record anything.",
  "citizen.sos.stepNow": "Now",
  "citizen.sos.stepDone": "Done",
  "citizen.sos.stepWaiting": "Not yet",
  "citizen.sos.detail.sent": "Location attached · {area}",
  "citizen.sos.detail.sentArea": "Saved area attached · {area}",
  "citizen.sos.detail.connected": "Your request is on an operator's screen",
  "citizen.sos.detail.connecting": "Reaching the control room",
  "citizen.sos.detail.operator": "{name} is with you",
  "citizen.sos.detail.operatorPending": "An operator is picking this up",
  "citizen.sos.detail.unit": "Unit {callSign} · {distance} away",
  "citizen.sos.detail.enRoute": "The unit is travelling to you",
  "citizen.sos.detail.enRoutePending": "Waiting for the unit to confirm",
  "citizen.sos.detail.arrived": "Officers are at your location",

  // SOS: ending it
  "citizen.sos.reason.label": "Reason",
  "citizen.sos.reason.safe": "I am safe now",
  "citizen.sos.reason.safeHint":
    "The danger has passed. The response can stand down.",
  "citizen.sos.reason.mistake": "Pressed by mistake",
  "citizen.sos.reason.mistakeHint": "There was no emergency.",
  "citizen.sos.reason.other": "Other",
  "citizen.sos.reason.otherHint": "Tell the control room in your own words.",
  "citizen.sos.reason.note": "Tell us more",
  "citizen.sos.reason.noteOptional":
    "Anything the control room should know (optional)",
  "citizen.sos.reason.required": "Choose a reason to continue.",
  "citizen.sos.reason.otherRequired":
    "Write a few words so the control room understands.",
  "citizen.sos.keepActive": "Keep emergency active",
  "citizen.sos.endEmergency": "End emergency",
  "citizen.sos.endedSafe": "Marked safe. The control room has been told.",
  "citizen.sos.endedCancelled": "SOS cancelled",

  // Silent mode
  "citizen.silent.title": "Silent mode",
  "citizen.silent.note":
    "This only changes how the screen looks. It does not record audio or video.",
  "citizen.silent.exit": "Full view",
  "citizen.silent.sharing": "Location is being shared",
  "citizen.silent.notSharing": "Live location is not being shared",

  // After an emergency
  "citizen.closure.safeTitle": "You marked yourself safe",
  "citizen.closure.cancelTitle": "SOS cancelled",
  "citizen.closure.resolvedTitle": "This emergency is closed",
  "citizen.closure.body":
    "The control room has the full record. Location sharing for this emergency has stopped.",
  "citizen.closure.ended": "Ended at",
  "citizen.closure.duration": "Duration",
  "citizen.closure.reason": "Reason given",
  "citizen.closure.outcome": "Outcome",
  "citizen.closure.whatHappened": "What happened",
  "citizen.closure.viewActivity": "View in activity",
  "citizen.closure.done": "Done",
  "citizen.closure.again": "If you need help again, hold the SOS button.",

  // Safety centre
  "citizen.safety.title": "Safety centre",
  "citizen.safety.description":
    "Short, practical guidance for difficult moments, and a plain account of what this app does when you ask for help.",
  "citizen.safety.situations": "What to do if",
  "citizen.safety.how": "How this app helps",
  "citizen.safety.followed": "You think you are being followed",
  "citizen.safety.followedSummary":
    "Get to people and light, then ask for help.",
  "citizen.safety.harassment": "Someone is harassing you",
  "citizen.safety.harassmentSummary":
    "Create distance first. Reporting can wait until you are safe.",
  "citizen.safety.accident": "You see or are in a road accident",
  "citizen.safety.accidentSummary": "Make yourself safe, then call for help.",
  "citizen.safety.cyber": "You have been targeted by online fraud",
  "citizen.safety.cyberSummary": "Stop, call your bank, keep the evidence.",
  "citizen.safety.vulnerable": "A child or an older person needs help",
  "citizen.safety.vulnerableSummary":
    "Stay with them somewhere visible and raise an SOS.",
  "citizen.safety.howSos": "How SOS works",
  "citizen.safety.howSosSummary":
    "A three-second hold, then an operator and a unit.",
  "citizen.safety.howSilent": "How silent SOS works",
  "citizen.safety.howSilentSummary":
    "The same emergency, with a quiet screen and chat only.",
  "citizen.safety.howLocation": "How and when your location is used",
  "citizen.safety.howLocationSummary":
    "Only when you ask for help or choose to share.",
  "citizen.safety.goSos": "Go to SOS",
  "citizen.safety.now": "Need help right now?",
  "citizen.safety.nowBody": "Do not read on. Open SOS and hold the button.",
  "citizen.safety.call112": "in a real emergency (this demo is not connected)",
  "citizen.safety.helplines": "Helplines",
  "citizen.safety.helplinesNote":
    "Helpline numbers are set for each deployment. This demonstration does not list or dial them.",
  "citizen.safety.helpline.women": "Women's helpline",
  "citizen.safety.helpline.womenBody":
    "Support and advice on harassment, stalking and violence at home.",
  "citizen.safety.helpline.child": "Child helpline",
  "citizen.safety.helpline.childBody":
    "For a child who is lost, hurt, or at risk from anyone.",
  "citizen.safety.helpline.cyber": "Cyber crime helpline",
  "citizen.safety.helpline.cyberBody":
    "For online fraud and financial scams. Call soon after the transaction.",
  "citizen.safety.helpline.senior": "Senior citizen helpline",
  "citizen.safety.helpline.seniorBody":
    "For older people who need assistance or are being mistreated.",

  // Nearby help
  "citizen.nearby.all": "All",
  "citizen.nearby.police": "Police",
  "citizen.nearby.hospital": "Hospital",
  "citizen.nearby.fire": "Fire station",
  "citizen.nearby.filter": "Filter by type",
  "citizen.nearby.list": "Places, nearest first",
  "citizen.nearby.origin": "Distances from your saved area, {area}",
  "citizen.nearby.drive": "About {min} min by road",
  "citizen.nearby.inCharge": "In charge: {name}",
  "citizen.nearby.note":
    "Places and distances are demonstration data. Your live location is not read on this screen.",
  "citizen.nearby.empty": "Nothing of this type nearby",
  "citizen.nearby.emptyBody": "Choose another type to see more places.",
  "citizen.nearby.mapLabel":
    "Map of nearby police stations, hospitals and fire stations",

  // Trusted contacts
  "citizen.contacts.description":
    "People you trust. For each of them, you decide when they are told and whether they can see your location.",
  "citizen.contacts.add": "Add contact",
  "citizen.contacts.addTitle": "Add a trusted contact",
  "citizen.contacts.editTitle": "Edit contact",
  "citizen.contacts.formBody":
    "Only a masked version of the number is kept and shown.",
  "citizen.contacts.name": "Name",
  "citizen.contacts.relation": "Relationship",
  "citizen.contacts.phone": "Mobile number",
  "citizen.contacts.nameError": "Enter a name between 2 and 60 characters.",
  "citizen.contacts.phoneError": "Enter a 10-digit Indian mobile number.",
  "citizen.contacts.phoneHelp": "10 digits. It is shown masked after saving.",
  "citizen.contacts.phoneKeep": "Leave blank to keep the saved number.",
  "citizen.contacts.added": "Contact added",
  "citizen.contacts.updated": "Contact updated",
  "citizen.contacts.removed": "Contact removed",
  "citizen.contacts.editNamed": "Edit {name}",
  "citizen.contacts.removeNamed": "Remove {name}",
  "citizen.contacts.removeTitle": "Remove {name}?",
  "citizen.contacts.removeBody":
    "They will no longer be told about an SOS or a journey, and will not see your location.",
  "citizen.contacts.remove": "Remove contact",
  "citizen.contacts.keep": "Keep contact",
  "citizen.contacts.notifySos": "Notify on SOS",
  "citizen.contacts.notifySosBody": "Told when you raise an SOS.",
  "citizen.contacts.notifyJourney": "Notify during journey emergency",
  "citizen.contacts.notifyJourneyBody":
    "Told if you ask for help or miss a check-in on a shared journey.",
  "citizen.contacts.shareLocation": "Share location during active emergency",
  "citizen.contacts.shareLocationBody":
    "Can see where you are until the emergency ends.",
  "citizen.contacts.empty": "No trusted contacts yet",
  "citizen.contacts.emptyBody":
    "Add someone you trust so they can be told when you raise an SOS.",
  "citizen.contacts.limit": "{count} of {max} contacts saved.",
  "citizen.contacts.limitReached":
    "You have saved {max} contacts, the most allowed. Remove one to add another.",
  "citizen.contacts.offTitle": "Emergency contacts are switched off",
  "citizen.contacts.offBody":
    "Nobody here will be told about an SOS until you turn it on in the privacy centre.",
  "citizen.contacts.howTitle": "How contacts are used",
  "citizen.contacts.how1":
    "A contact is told only in the situations you switch on for them.",
  "citizen.contacts.how2":
    "Location is shared with a contact only while an emergency is active, and stops when it ends.",
  "citizen.contacts.how3":
    "Contacts never see your reports, complaints or chat with the control room.",
  "citizen.relation.Mother": "Mother",
  "citizen.relation.Father": "Father",
  "citizen.relation.Partner": "Partner",
  "citizen.relation.Friend": "Friend",
  "citizen.relation.Guardian": "Guardian",
  "citizen.relation.Sibling": "Sibling",
  "citizen.relation.Other": "Other",

  // Profile
  "citizen.profile.description":
    "Your details, language and appearance on this device.",
  "citizen.profile.verified": "Verified",
  "citizen.profile.unverified": "Not verified",
  "citizen.profile.email": "Email",
  "citizen.profile.area": "Saved area",
  "citizen.profile.maskedNote":
    "Your number is masked everywhere in the app, including on staff screens.",
  "citizen.profile.shortcuts": "Profile shortcuts",
  "citizen.profile.languageBody": "Used across the citizen app.",
  "citizen.profile.device": "This device",
  "citizen.profile.signedInOn": "Signed in on",
  "citizen.profile.signedInAt": "Since",
  "citizen.profile.signOut": "Sign out of the demo",
  "citizen.profile.signOutTitle": "Sign out of the demo?",
  "citizen.profile.signOutBody":
    "You return to the start page, where you can choose another role. Demo data stays as it is.",

  // Privacy centre
  "citizen.privacy.title": "Privacy centre",
  "citizen.privacy.description":
    "What this app may use, what it shares and with whom. Every change you make is recorded below.",
  "citizen.privacy.deviceTitle": "Permissions",
  "citizen.privacy.sharingTitle": "Sharing",
  "citizen.privacy.location": "Location access",
  "citizen.privacy.locationBody":
    "Lets the app read this phone's position when you raise an SOS, share a journey or attach a place to a report.",
  "citizen.privacy.camera": "Camera",
  "citizen.privacy.cameraBody":
    "Used only when you take a photo or start a video session.",
  "citizen.privacy.microphone": "Microphone",
  "citizen.privacy.microphoneBody":
    "Used only during a voice or video session that you start.",
  "citizen.privacy.notifications": "Notifications",
  "citizen.privacy.notificationsBody":
    "Updates on your emergencies, complaints and journeys.",
  "citizen.privacy.emergencyContacts": "Emergency contacts",
  "citizen.privacy.emergencyContactsBody":
    "Allows your trusted contacts to be told when you raise an SOS.",
  "citizen.privacy.emergencyLocation": "Emergency location sharing",
  "citizen.privacy.journeySharing": "Journey sharing",
  "citizen.privacy.journeySharingBody":
    "Shares your route with the contacts you choose while a journey is active, and stops when it ends.",
  "citizen.privacy.paused": "Paused while Location access is off",
  "citizen.privacy.turnedOn": "{name} turned on",
  "citizen.privacy.turnedOff": "{name} turned off",
  "citizen.privacy.allowed": "Allowed",
  "citizen.privacy.withdrawn": "Withdrawn",
  "citizen.privacy.historyTitle": "Consent history",
  "citizen.privacy.historyBody":
    "Each time you change a permission, the change and the time are kept here.",
  "citizen.privacy.historyEmpty": "No changes yet",
  "citizen.privacy.historyEmptyBody":
    "Your settings are as they were when you first opened the app.",
  "citizen.privacy.showAll": "Show all {count}",
  "citizen.privacy.showFewer": "Show fewer",
  "citizen.privacy.downloadTitle": "Download my data",
  "citizen.privacy.downloadBody":
    "A file with your own emergencies, complaints, contacts and consent choices.",
  "citizen.privacy.download": "Download my data",
  "citizen.privacy.downloaded": "Your data file was downloaded",
  "citizen.privacy.downloadedAt":
    "Downloaded at {time}. The request is recorded in the audit log.",
  "citizen.privacy.downloadNote":
    "The file is built on this device as JSON. Nothing is uploaded.",
  "citizen.privacy.downloadFailed": "The file could not be created. Try again.",
  "citizen.privacy.count.incidents": "Incidents",
  "citizen.privacy.count.complaints": "Complaints",
  "citizen.privacy.count.contacts": "Contacts",
  "citizen.privacy.count.consents": "Consents",
  "citizen.privacy.infoTitle": "Privacy information",
  "citizen.privacy.info.collected": "What is collected",
  "citizen.privacy.info.collectedBody":
    "Your name, a masked phone number, what you report, and anything you choose to attach. Nothing is gathered in the background.",
  "citizen.privacy.info.location": "When location is read",
  "citizen.privacy.info.locationBody":
    "When you raise an SOS, during a journey you chose to share, or when you add a place to a report. At no other time.",
  "citizen.privacy.info.who": "Who can see it",
  "citizen.privacy.info.whoBody":
    "The operator handling your case and the unit sent to you. Staff see a shortened name and a masked number.",
  "citizen.privacy.info.audit": "Staff access is role-based and audited",
  "citizen.privacy.info.auditBody":
    "Each staff role opens only what its work needs, and every record that is opened is written to an audit log.",
} as const;

export type CitizenKey = keyof typeof en;

const gu: Partial<Record<CitizenKey, string>> = {
  "citizen.greeting.morning": "સુપ્રભાત, {name}",
  "citizen.greeting.afternoon": "નમસ્તે, {name}",
  "citizen.greeting.evening": "શુભ સાંજ, {name}",
  "citizen.safetyStatus": "સુરક્ષા સ્થિતિ",
  "citizen.safetyStatus.normal": "સામાન્ય",
  "citizen.safetyStatus.active": "ઇમરજન્સી ચાલુ છે",
  "citizen.emergency.title": "ઇમરજન્સી?",
  "citizen.emergency.body":
    "બટન 3 સેકન્ડ દબાવી રાખો. તમારું સ્થાન કંટ્રોલ રૂમને મોકલાશે.",
  "citizen.sos.hold": "SOS માટે દબાવી રાખો",
  "citizen.sos.holdHint": "3 સેકન્ડ દબાવી રાખો",
  "citizen.sos.keepHolding": "દબાવી રાખો",
  "citizen.sos.release": "રદ કરવા છોડી દો",
  "citizen.sos.activated": "SOS સક્રિય થયું",
  "citizen.sos.active": "ઇમરજન્સી ચાલુ છે",
  "citizen.sos.coordinating": "મદદની વ્યવસ્થા થઈ રહી છે",
  "citizen.sos.queued": "ઇમરજન્સી વિનંતી કતારમાં છે",
  "citizen.sos.queuedBody":
    "તમે ઓફલાઇન છો. જોડાણ મળતાં જ અમે તે મોકલીશું. શક્ય હોય તો 112 પર કૉલ કરો.",
  "citizen.sos.viewActive": "ચાલુ ઇમરજન્સી ખોલો",
  "citizen.sos.step.sent": "SOS મોકલાયું",
  "citizen.sos.step.connected": "કંટ્રોલ રૂમ જોડાયો",
  "citizen.sos.step.operator": "ઓપરેટર સોંપાયા",
  "citizen.sos.step.unit": "પોલીસ યુનિટ સોંપાયું",
  "citizen.sos.step.enRoute": "મદદ રસ્તામાં છે",
  "citizen.sos.step.arrived": "મદદ પહોંચી ગઈ",
  "citizen.sos.operator": "ઓપરેટર",
  "citizen.sos.responder": "મદદ કરનાર",
  "citizen.sos.eta": "અંદાજિત સમય",
  "citizen.sos.liveStatus": "હાલની સ્થિતિ",
  "citizen.sos.voice": "વૉઇસ",
  "citizen.sos.video": "વીડિયો",
  "citizen.sos.chat": "ચેટ",
  "citizen.sos.shareMedia": "મીડિયા મોકલો",
  "citizen.sos.trustedContact": "વિશ્વાસુ સંપર્ક",
  "citizen.sos.silentMode": "સાયલન્ટ મોડ",
  "citizen.sos.iAmSafe": "હું સલામત છું",
  "citizen.sos.cancel": "SOS રદ કરો",
  "citizen.sos.cancelTitle": "આ ઇમરજન્સી સમાપ્ત કરવી છે?",
  "citizen.sos.cancelBody":
    "કારણ જણાવો, જેથી કંટ્રોલ રૂમને ખબર પડે કે તમે સલામત છો.",
  "citizen.quick.police": "પોલીસ મદદ",
  "citizen.quick.medical": "તબીબી",
  "citizen.quick.fire": "આગ",
  "citizen.quick.women": "મહિલા સુરક્ષા",
  "citizen.quick.child": "બાળ સુરક્ષા",
  "citizen.quick.report": "ઘટનાની જાણ કરો",
  "citizen.section.journey": "મુસાફરી સુરક્ષા",
  "citizen.section.report": "કંઈક જાણ કરો",
  "citizen.section.complaints": "મારી ફરિયાદો",
  "citizen.section.nearby": "નજીકની મદદ",
  "citizen.section.contacts": "ઇમરજન્સી સંપર્કો",
  "citizen.section.safetyCenter": "સુરક્ષા કેન્દ્ર",
  "citizen.locationShared": "સ્થાન મદદ કરનારાઓ સાથે શેર થઈ રહ્યું છે",
  "citizen.locationNotShared": "સ્થાન શેર થઈ રહ્યું નથી",
  "citizen.privacy.emergencySharing":
    "ઇમરજન્સી લોકેશન શેરિંગ ચાલુ હોય ત્યારે, સક્રિય ઇમરજન્સી દરમિયાન તમારું સ્થાન અધિકૃત મદદ કરનારાઓ સાથે શેર થઈ શકે છે.",

  // Home
  "citizen.emergency.bodyNoLocation":
    "બટન 3 સેકન્ડ દબાવી રાખો. લાઇવ સ્થાન બંધ છે, તેથી ફક્ત તમારો સાચવેલો વિસ્તાર મોકલાશે.",
  "citizen.home.cannotHold": "દબાવી રાખી શકતા નથી? બે ટૅપમાં પુષ્ટિ કરો",
  "citizen.home.confirmTitle": "હમણાં SOS મોકલવું છે?",
  "citizen.home.confirmBody":
    "તમારા નામ અને સ્થાન સાથે કંટ્રોલ રૂમને તરત જાણ થશે.",
  "citizen.home.confirmAction": "SOS મોકલો",
  "citizen.home.silent": "સાયલન્ટ SOS",
  "citizen.home.silentTitle": "સાયલન્ટ SOS મોકલવું છે?",
  "citizen.home.silentBody":
    "કંટ્રોલ રૂમને જાણ થશે અને તેઓ ફક્ત ચેટથી જવાબ આપશે. આ સ્ક્રીન ઝાંખી રહેશે અને કોઈ અવાજ નહીં થાય. કશું રેકોર્ડ થતું નથી.",
  "citizen.home.silentAction": "સાયલન્ટ SOS મોકલો",
  "citizen.home.silentActive": "સાયલન્ટ SOS ચાલુ છે",
  "citizen.home.activeBody":
    "મદદની વ્યવસ્થા થઈ રહી છે. હાલની સ્થિતિ જોવા અને કંટ્રોલ રૂમ સાથે વાત કરવા તેને ખોલો.",
  "citizen.home.sending": "મોકલાઈ રહ્યું છે…",
  "citizen.home.quickTitle": "કોઈ ખાસ પ્રકારની મદદ જોઈએ છે?",
  "citizen.home.quickHint": "કંઈ પણ મોકલતા પહેલાં દરેક તમારી પુષ્ટિ માગે છે.",
  "citizen.home.toolsTitle": "સુરક્ષા સાધનો",
  "citizen.home.journeyDesc": "તમારી મુસાફરી વિશ્વાસુ લોકો સાથે શેર કરો",
  "citizen.home.reportDesc": "ઇમરજન્સી ન હોય તેવી બાબત પોલીસને જણાવો",
  "citizen.home.complaintsDesc": "તમે કરેલી જાણની સ્થિતિ જુઓ",
  "citizen.home.nearbyDesc": "પોલીસ સ્ટેશન, હોસ્પિટલ અને ફાયર સ્ટેશન",
  "citizen.home.contactsDesc": "તમે SOS કરો ત્યારે જેમને જાણ થાય છે",
  "citizen.home.safetyDesc": "સામાન્ય પરિસ્થિતિઓમાં શું કરવું",
  "citizen.home.openCount": "{count} ચાલુ",
  "citizen.home.contactsCount": "{count} સાચવેલા",

  // Quick help
  "citizen.quick.sheetTitle": "{kind}: વિનંતીની પુષ્ટિ કરો",
  "citizen.quick.policeBody":
    "પોલીસ યુનિટ તમારી પાસે આવે તે માટે ઇમરજન્સી નોંધાય છે.",
  "citizen.quick.medicalBody":
    "તબીબી ઇમરજન્સી નોંધાય છે. કંટ્રોલ રૂમ એમ્બ્યુલન્સની વ્યવસ્થા કરે છે અને સૌથી નજીકનું યુનિટ મોકલે છે.",
  "citizen.quick.fireBody":
    "આગની ઇમરજન્સી નોંધાય છે. કંટ્રોલ રૂમ ફાયર સેવાને જાણ કરે છે અને સૌથી નજીકનું યુનિટ મોકલે છે.",
  "citizen.quick.womenBody":
    "મહિલા સુરક્ષાની ઇમરજન્સી નોંધાય છે. ઉપલબ્ધ હોય ત્યાં મહિલા હેલ્પ યુનિટ મોકલાય છે.",
  "citizen.quick.childBody":
    "ખોવાયેલા, ઘાયલ કે જોખમમાં હોય તેવા બાળક માટે ઇમરજન્સી નોંધાય છે.",
  "citizen.quick.willSend": "શું મોકલાશે",
  "citizen.quick.sendLocation": "તમારું હાલનું સ્થાન: {place}",
  "citizen.quick.sendArea": "ફક્ત તમારો સાચવેલો વિસ્તાર: {place}",
  "citizen.quick.sendIdentity": "તમારું નામ અને ઢાંકેલો ફોન નંબર",
  "citizen.quick.sendKind": "મદદનો પ્રકાર: {kind}, ગંભીર તરીકે ચિહ્નિત",
  "citizen.quick.sendContacts": "વિશ્વાસુ સંપર્કોને જાણ થશે: {names}",
  "citizen.quick.noteLabel": "થોડા શબ્દો ઉમેરો (વૈકલ્પિક)",
  "citizen.quick.notePlaceholder": "શું થઈ રહ્યું છે?",
  "citizen.quick.send": "વિનંતી મોકલો",
  "citizen.quick.demoNote":
    "આ એક ડેમો છે. વાસ્તવિક ઇમરજન્સી સેવાઓ સુધી કશું પહોંચતું નથી. સાચી ઇમરજન્સીમાં 112 પર કૉલ કરો.",

  // SOS: before it is raised
  "citizen.sos.whatHappens": "દબાવી રાખશો ત્યારે શું થશે",
  "citizen.sos.what1": "તમારું નામ અને સ્થાન કંટ્રોલ રૂમને જાય છે.",
  "citizen.sos.what1Off":
    "તમારું નામ અને સાચવેલો વિસ્તાર કંટ્રોલ રૂમને જાય છે. લાઇવ સ્થાન બંધ રહે છે.",
  "citizen.sos.what2": "ઓપરેટર ચેટ, વૉઇસ કે વીડિયોથી તમારી સાથે રહે છે.",
  "citizen.sos.what3": "સૌથી નજીકનું ઉપલબ્ધ પોલીસ યુનિટ તમારી પાસે મોકલાય છે.",
  "citizen.sos.sharingOn": "ઇમરજન્સી લોકેશન શેરિંગ ચાલુ છે",
  "citizen.sos.sharingOff": "ઇમરજન્સી લોકેશન શેરિંગ બંધ છે",
  "citizen.sos.sharingOffBody":
    "મદદ કરનારાઓને તમારો સાચવેલો વિસ્તાર મળશે, તમે હમણાં જ્યાં છો તે નહીં.",
  "citizen.sos.openPrivacy": "ગોપનીયતા કેન્દ્ર ખોલો",
  "citizen.sos.kbdHint": "કીબોર્ડથી Space અથવા Enter 3 સેકન્ડ દબાવી રાખો.",
  "citizen.sos.alreadyActive": "તમારી એક ઇમરજન્સી પહેલેથી ચાલુ છે",
  "citizen.sos.contactsWillTell": "તમે SOS કરશો ત્યારે {names}ને જાણ થશે.",
  "citizen.sos.contactsNoneShort":
    "જાણ કરવા માટે કોઈ વિશ્વાસુ સંપર્ક નક્કી નથી",
  "citizen.sos.contactsOffShort": "ઇમરજન્સી સંપર્કો બંધ છે",

  // SOS: raised with no connection
  "citizen.sos.fallback": "ઇમરજન્સી વૈકલ્પિક માર્ગનો પ્રયાસ ચાલુ છે",
  "citizen.sos.queuedDetail":
    "હજુ સુધી કશું મોકલાયું નથી. તમારી વિનંતી આ ફોનમાં સાચવેલી છે અને જોડાણ પાછું આવતાં જ કંટ્રોલ રૂમને જશે.",
  "citizen.sos.queuedNoSms":
    "તમારા વતી કોઈ SMS કે ફોન કૉલ કરવામાં આવ્યો નથી. ઍપ જોડાણ માટે પ્રયાસ કરતી રહે છે.",
  "citizen.sos.call112": "શક્ય હોય તો 112 પર કૉલ કરો",
  "citizen.sos.cancelRequest": "વિનંતી રદ કરો",
  "citizen.sos.queuedSaved": "આ ફોનમાં સાચવેલું",
  "citizen.sos.waiting": "મોકલવાની રાહમાં",
  "citizen.sos.connection": "જોડાણ",
  "citizen.sos.queuedLocation": "તમે વિનંતી કરી ત્યારે નોંધાયેલું સ્થાન",
  "citizen.sos.queuedArea": "તમારો સાચવેલો વિસ્તાર મોકલાશે",
  "citizen.sos.whileWaiting": "રાહ જોતી વખતે",
  "citizen.sos.whileWaiting1":
    "સલામત હોય તો લોકો અને પ્રકાશ હોય તેવી જગ્યા તરફ જાઓ.",
  "citizen.sos.whileWaiting2":
    "112 પર અથવા કોઈ વિશ્વાસુ વ્યક્તિને ફોન કરવાનો પ્રયાસ કરો.",
  "citizen.sos.whileWaiting3":
    "આ સ્ક્રીન ખુલ્લી રાખો. શક્ય બનતાં જ વિનંતી આપમેળે મોકલાશે.",

  // SOS: in progress
  "citizen.sos.onTheWay": "મદદ રસ્તામાં છે",
  "citizen.sos.helpArrived": "મદદ પહોંચી ગઈ છે",
  "citizen.sos.incidentId": "ઘટના ID",
  "citizen.sos.raisedAt": "નોંધાયાનો સમય",
  "citizen.sos.kind": "પ્રકાર",
  "citizen.sos.connecting": "જોડાઈ રહ્યું છે…",
  "citizen.sos.controlRoom": "કંટ્રોલ રૂમ",
  "citizen.sos.unit": "યુનિટ {callSign}",
  "citizen.sos.responderPending": "હજુ સોંપાયું નથી",
  "citizen.sos.findingUnit": "સૌથી નજીકનું યુનિટ શોધાઈ રહ્યું છે",
  "citizen.sos.etaAbout": "લગભગ {min} મિનિટ",
  "citizen.sos.etaEstimate": "અંદાજ. યુનિટ હજુ નીકળ્યું નથી.",
  "citizen.sos.etaLive": "યુનિટ આગળ વધે તેમ સમય ઘટે છે",
  "citizen.sos.etaPending": "યુનિટ સોંપાયા પછી સમય દેખાશે.",
  "citizen.sos.arrived": "પહોંચી ગયું",
  "citizen.sos.arriving": "પહોંચી રહ્યું છે",
  "citizen.sos.areaShared": "સાચવેલો વિસ્તાર શેર થયો છે, લાઇવ સ્થાન નહીં",
  "citizen.sos.mapLabel": "તમારા સ્થાન અને આવી રહેલા યુનિટનો નકશો",
  "citizen.sos.more": "વધુ વિકલ્પો",
  "citizen.sos.chatTitle": "કંટ્રોલ રૂમ સાથે ચેટ",
  "citizen.sos.chatWith": "{name} તમારી સાથે છે",
  "citizen.sos.chatPlaceholder": "કંટ્રોલ રૂમને લખો…",
  "citizen.sos.reply.safeForNow": "હું હાલ સલામત છું",
  "citizen.sos.reply.stillHere": "તેઓ હજુ અહીં જ છે",
  "citizen.sos.reply.cannotTalk": "હાલ વાત થઈ શકે તેમ નથી",
  "citizen.sos.reply.moved": "મેં જગ્યા બદલી છે",
  "citizen.sos.worseToast": "કંટ્રોલ રૂમને જણાવાયું છે કે સ્થિતિ બગડી રહી છે",
  "citizen.sos.sessionVoice": "કંટ્રોલ રૂમ સાથે વૉઇસ સેશન",
  "citizen.sos.sessionVideo": "કંટ્રોલ રૂમ સાથે વીડિયો સેશન",
  "citizen.sos.shareMediaBody":
    "કંટ્રોલ રૂમને ફોટો, વીડિયો કે ઑડિયો મોકલો. તે આ ઇમરજન્સી સાથે જોડાય છે.",
  "citizen.sos.shareMediaHint": "ફોટો, વીડિયો કે ઑડિયો",
  "citizen.sos.shared": "અત્યાર સુધી મોકલેલું",
  "citizen.sos.sharedCount": "કંટ્રોલ રૂમને {count} મોકલ્યાં",
  "citizen.sos.nothingShared": "હજુ કશું મોકલ્યું નથી.",
  "citizen.sos.mediaSent": "કંટ્રોલ રૂમને મોકલાયું",
  "citizen.sos.contactsNotified":
    "તમે આ SOS કર્યું ત્યારે આ સંપર્કોને જાણ કરાઈ.",
  "citizen.sos.contactsQueued": "વિનંતી મોકલાયા પછી આ સંપર્કોને જાણ થશે.",
  "citizen.sos.contactsNone":
    "SOS વિશે જાણ કરવા કોઈ વિશ્વાસુ સંપર્ક નક્કી નથી. તમે હમણાં ઉમેરી શકો છો.",
  "citizen.sos.contactsOff":
    "તમારી ગોપનીયતા સેટિંગમાં ઇમરજન્સી સંપર્કો બંધ છે, તેથી કોઈને જાણ કરાઈ નથી.",
  "citizen.sos.contactsTold": "{names}ને જાણ કરાઈ",
  "citizen.sos.contactTold": "જાણ કરાઈ",
  "citizen.sos.contactWaiting": "બાકી",
  "citizen.sos.contactsDemo":
    "આ ડેમોમાં કોઈ SMS કે કૉલ થતો નથી. ઍપ ફક્ત આ સંપર્કોને જાણ થયાનું દર્શાવે છે.",
  "citizen.sos.manageContacts": "સંપર્કો સંભાળો",
  "citizen.sos.silentModeBody":
    "આ સ્ક્રીન ઝાંખી કરે છે અને વૉઇસ તથા વીડિયો છુપાવે છે. તે કશું રેકોર્ડ કરતું નથી.",
  "citizen.sos.stepNow": "હમણાં",
  "citizen.sos.stepDone": "પૂર્ણ",
  "citizen.sos.stepWaiting": "હજુ બાકી",
  "citizen.sos.detail.sent": "સ્થાન જોડાયું · {area}",
  "citizen.sos.detail.sentArea": "સાચવેલો વિસ્તાર જોડાયો · {area}",
  "citizen.sos.detail.connected": "તમારી વિનંતી ઓપરેટરની સ્ક્રીન પર છે",
  "citizen.sos.detail.connecting": "કંટ્રોલ રૂમ સુધી પહોંચી રહ્યું છે",
  "citizen.sos.detail.operator": "{name} તમારી સાથે છે",
  "citizen.sos.detail.operatorPending": "ઓપરેટર આ વિનંતી હાથ પર લઈ રહ્યા છે",
  "citizen.sos.detail.unit": "યુનિટ {callSign} · {distance} દૂર",
  "citizen.sos.detail.enRoute": "યુનિટ તમારી તરફ આવી રહ્યું છે",
  "citizen.sos.detail.enRoutePending": "યુનિટની પુષ્ટિની રાહ જોવાઈ રહી છે",
  "citizen.sos.detail.arrived": "અધિકારીઓ તમારા સ્થાન પર છે",

  // SOS: ending it
  "citizen.sos.reason.label": "કારણ",
  "citizen.sos.reason.safe": "હું હવે સલામત છું",
  "citizen.sos.reason.safeHint": "જોખમ ટળી ગયું છે. મદદ પાછી બોલાવી શકાય.",
  "citizen.sos.reason.mistake": "ભૂલથી દબાઈ ગયું",
  "citizen.sos.reason.mistakeHint": "કોઈ ઇમરજન્સી નહોતી.",
  "citizen.sos.reason.other": "અન્ય",
  "citizen.sos.reason.otherHint": "કંટ્રોલ રૂમને તમારા શબ્દોમાં જણાવો.",
  "citizen.sos.reason.note": "વધુ જણાવો",
  "citizen.sos.reason.noteOptional":
    "કંટ્રોલ રૂમને જાણવા જેવું કંઈ હોય તો (વૈકલ્પિક)",
  "citizen.sos.reason.required": "આગળ વધવા માટે કારણ પસંદ કરો.",
  "citizen.sos.reason.otherRequired":
    "કંટ્રોલ રૂમ સમજી શકે તે માટે થોડા શબ્દો લખો.",
  "citizen.sos.keepActive": "ઇમરજન્સી ચાલુ રાખો",
  "citizen.sos.endEmergency": "ઇમરજન્સી સમાપ્ત કરો",
  "citizen.sos.endedSafe": "સલામત તરીકે નોંધાયું. કંટ્રોલ રૂમને જાણ કરાઈ છે.",
  "citizen.sos.endedCancelled": "SOS રદ થયું",

  // Silent mode
  "citizen.silent.title": "સાયલન્ટ મોડ",
  "citizen.silent.note":
    "આ ફક્ત સ્ક્રીનનો દેખાવ બદલે છે. તે ઑડિયો કે વીડિયો રેકોર્ડ કરતું નથી.",
  "citizen.silent.exit": "પૂરી સ્ક્રીન",
  "citizen.silent.sharing": "સ્થાન શેર થઈ રહ્યું છે",
  "citizen.silent.notSharing": "લાઇવ સ્થાન શેર થઈ રહ્યું નથી",

  // After an emergency
  "citizen.closure.safeTitle": "તમે પોતાને સલામત જણાવ્યા",
  "citizen.closure.cancelTitle": "SOS રદ થયું",
  "citizen.closure.resolvedTitle": "આ ઇમરજન્સી બંધ થઈ છે",
  "citizen.closure.body":
    "સંપૂર્ણ નોંધ કંટ્રોલ રૂમ પાસે છે. આ ઇમરજન્સી માટેનું સ્થાન શેરિંગ બંધ થયું છે.",
  "citizen.closure.ended": "સમાપ્ત થયાનો સમય",
  "citizen.closure.duration": "અવધિ",
  "citizen.closure.reason": "આપેલું કારણ",
  "citizen.closure.outcome": "પરિણામ",
  "citizen.closure.whatHappened": "શું થયું",
  "citizen.closure.viewActivity": "પ્રવૃત્તિમાં જુઓ",
  "citizen.closure.done": "થઈ ગયું",
  "citizen.closure.again": "ફરી મદદ જોઈએ તો SOS બટન દબાવી રાખો.",

  // Safety centre
  "citizen.safety.title": "સુરક્ષા કેન્દ્ર",
  "citizen.safety.description":
    "મુશ્કેલ ક્ષણો માટે ટૂંકું, વ્યવહારુ માર્ગદર્શન, અને તમે મદદ માગો ત્યારે આ ઍપ શું કરે છે તેની સાદી સમજ.",
  "citizen.safety.situations": "આવું થાય તો શું કરવું",
  "citizen.safety.how": "આ ઍપ કેવી રીતે મદદ કરે છે",
  "citizen.safety.followed": "તમને લાગે કે કોઈ તમારો પીછો કરે છે",
  "citizen.safety.followedSummary":
    "લોકો અને પ્રકાશ હોય ત્યાં પહોંચો, પછી મદદ માગો.",
  "citizen.safety.harassment": "કોઈ તમને હેરાન કરે છે",
  "citizen.safety.harassmentSummary":
    "પહેલાં અંતર બનાવો. જાણ તમે સલામત થાઓ પછી પણ કરી શકાય.",
  "citizen.safety.accident": "તમે માર્ગ અકસ્માત જુઓ અથવા તેમાં હો",
  "citizen.safety.accidentSummary": "પહેલાં પોતે સલામત થાઓ, પછી મદદ બોલાવો.",
  "citizen.safety.cyber": "તમારી સાથે ઑનલાઇન છેતરપિંડી થઈ છે",
  "citizen.safety.cyberSummary": "અટકો, બેંકને ફોન કરો, પુરાવા સાચવો.",
  "citizen.safety.vulnerable": "કોઈ બાળક કે વડીલને મદદની જરૂર છે",
  "citizen.safety.vulnerableSummary":
    "દેખાય તેવી જગ્યાએ તેમની સાથે રહો અને SOS કરો.",
  "citizen.safety.howSos": "SOS કેવી રીતે કામ કરે છે",
  "citizen.safety.howSosSummary":
    "ત્રણ સેકન્ડ દબાવી રાખો, પછી ઓપરેટર અને યુનિટ.",
  "citizen.safety.howSilent": "સાયલન્ટ SOS કેવી રીતે કામ કરે છે",
  "citizen.safety.howSilentSummary":
    "એ જ ઇમરજન્સી, શાંત સ્ક્રીન અને ફક્ત ચેટ સાથે.",
  "citizen.safety.howLocation": "તમારું સ્થાન ક્યારે અને કેવી રીતે વપરાય છે",
  "citizen.safety.howLocationSummary":
    "ફક્ત તમે મદદ માગો અથવા શેર કરવાનું પસંદ કરો ત્યારે.",
  "citizen.safety.goSos": "SOS પર જાઓ",
  "citizen.safety.now": "હમણાં જ મદદ જોઈએ છે?",
  "citizen.safety.nowBody": "આગળ વાંચશો નહીં. SOS ખોલો અને બટન દબાવી રાખો.",
  "citizen.safety.call112": "સાચી ઇમરજન્સીમાં (આ ડેમો જોડાયેલો નથી)",
  "citizen.safety.helplines": "હેલ્પલાઇન",
  "citizen.safety.helplinesNote":
    "હેલ્પલાઇન નંબર દરેક અમલીકરણ પ્રમાણે નક્કી થાય છે. આ ડેમો તે દર્શાવતો કે ડાયલ કરતો નથી.",
  "citizen.safety.helpline.women": "મહિલા હેલ્પલાઇન",
  "citizen.safety.helpline.womenBody":
    "હેરાનગતિ, પીછો અને ઘરેલુ હિંસા અંગે સહાય અને સલાહ.",
  "citizen.safety.helpline.child": "બાળ હેલ્પલાઇન",
  "citizen.safety.helpline.childBody":
    "ખોવાયેલા, ઘાયલ કે કોઈથી જોખમમાં હોય તેવા બાળક માટે.",
  "citizen.safety.helpline.cyber": "સાયબર ક્રાઇમ હેલ્પલાઇન",
  "citizen.safety.helpline.cyberBody":
    "ઑનલાઇન છેતરપિંડી અને નાણાકીય કૌભાંડ માટે. વ્યવહાર પછી જલદી કૉલ કરો.",
  "citizen.safety.helpline.senior": "વરિષ્ઠ નાગરિક હેલ્પલાઇન",
  "citizen.safety.helpline.seniorBody":
    "જે વડીલોને સહાયની જરૂર હોય અથવા જેમની સાથે ગેરવર્તન થતું હોય તેમના માટે.",

  // Nearby help
  "citizen.nearby.all": "બધા",
  "citizen.nearby.police": "પોલીસ",
  "citizen.nearby.hospital": "હોસ્પિટલ",
  "citizen.nearby.fire": "ફાયર સ્ટેશન",
  "citizen.nearby.filter": "પ્રકાર પ્રમાણે ફિલ્ટર કરો",
  "citizen.nearby.list": "સ્થળો, સૌથી નજીકનું પહેલાં",
  "citizen.nearby.origin": "અંતર તમારા સાચવેલા વિસ્તાર {area}થી",
  "citizen.nearby.drive": "રસ્તા માર્ગે લગભગ {min} મિનિટ",
  "citizen.nearby.inCharge": "ઇન્ચાર્જ: {name}",
  "citizen.nearby.note":
    "સ્થળો અને અંતર ડેમો માહિતી છે. આ સ્ક્રીન પર તમારું લાઇવ સ્થાન વંચાતું નથી.",
  "citizen.nearby.empty": "આ પ્રકારનું કશું નજીકમાં નથી",
  "citizen.nearby.emptyBody": "વધુ સ્થળો જોવા બીજો પ્રકાર પસંદ કરો.",
  "citizen.nearby.mapLabel":
    "નજીકના પોલીસ સ્ટેશન, હોસ્પિટલ અને ફાયર સ્ટેશનનો નકશો",

  // Trusted contacts
  "citizen.contacts.description":
    "તમારા વિશ્વાસુ લોકો. દરેક માટે તમે નક્કી કરો છો કે તેમને ક્યારે જાણ થાય અને તેઓ તમારું સ્થાન જોઈ શકે કે નહીં.",
  "citizen.contacts.add": "સંપર્ક ઉમેરો",
  "citizen.contacts.addTitle": "વિશ્વાસુ સંપર્ક ઉમેરો",
  "citizen.contacts.editTitle": "સંપર્ક સુધારો",
  "citizen.contacts.formBody":
    "નંબરનું ફક્ત ઢાંકેલું રૂપ સાચવાય છે અને દેખાય છે.",
  "citizen.contacts.name": "નામ",
  "citizen.contacts.relation": "સંબંધ",
  "citizen.contacts.phone": "મોબાઇલ નંબર",
  "citizen.contacts.nameError": "2 થી 60 અક્ષરનું નામ લખો.",
  "citizen.contacts.phoneError": "10 અંકનો ભારતીય મોબાઇલ નંબર લખો.",
  "citizen.contacts.phoneHelp": "10 અંક. સાચવ્યા પછી તે ઢાંકેલો દેખાશે.",
  "citizen.contacts.phoneKeep": "સાચવેલો નંબર રાખવા ખાલી છોડો.",
  "citizen.contacts.added": "સંપર્ક ઉમેરાયો",
  "citizen.contacts.updated": "સંપર્ક સુધારાયો",
  "citizen.contacts.removed": "સંપર્ક દૂર કરાયો",
  "citizen.contacts.editNamed": "{name} સુધારો",
  "citizen.contacts.removeNamed": "{name} દૂર કરો",
  "citizen.contacts.removeTitle": "{name}ને દૂર કરવા છે?",
  "citizen.contacts.removeBody":
    "તેમને હવે SOS કે મુસાફરી વિશે જાણ નહીં થાય અને તેઓ તમારું સ્થાન જોઈ નહીં શકે.",
  "citizen.contacts.remove": "સંપર્ક દૂર કરો",
  "citizen.contacts.keep": "સંપર્ક રાખો",
  "citizen.contacts.notifySos": "SOS વખતે જાણ કરો",
  "citizen.contacts.notifySosBody": "તમે SOS કરો ત્યારે જાણ થાય છે.",
  "citizen.contacts.notifyJourney": "મુસાફરીની ઇમરજન્સી વખતે જાણ કરો",
  "citizen.contacts.notifyJourneyBody":
    "શેર કરેલી મુસાફરીમાં તમે મદદ માગો અથવા ચેક-ઇન ચૂકી જાઓ તો જાણ થાય છે.",
  "citizen.contacts.shareLocation": "ચાલુ ઇમરજન્સી દરમિયાન સ્થાન શેર કરો",
  "citizen.contacts.shareLocationBody":
    "ઇમરજન્સી પૂરી થાય ત્યાં સુધી તમે ક્યાં છો તે જોઈ શકે છે.",
  "citizen.contacts.empty": "હજુ કોઈ વિશ્વાસુ સંપર્ક નથી",
  "citizen.contacts.emptyBody":
    "કોઈ વિશ્વાસુ વ્યક્તિ ઉમેરો, જેથી તમે SOS કરો ત્યારે તેમને જાણ થાય.",
  "citizen.contacts.limit": "{max}માંથી {count} સંપર્ક સાચવેલા છે.",
  "citizen.contacts.offTitle": "ઇમરજન્સી સંપર્કો બંધ છે",
  "citizen.contacts.offBody":
    "તમે ગોપનીયતા કેન્દ્રમાં તે ચાલુ ન કરો ત્યાં સુધી અહીં કોઈને SOS વિશે જાણ નહીં થાય.",
  "citizen.contacts.howTitle": "સંપર્કોનો ઉપયોગ કેવી રીતે થાય છે",
  "citizen.contacts.how1":
    "સંપર્કને ફક્ત તે જ પરિસ્થિતિમાં જાણ થાય છે જે તમે તેમના માટે ચાલુ કરો.",
  "citizen.contacts.how2":
    "સ્થાન ફક્ત ઇમરજન્સી ચાલુ હોય ત્યારે જ સંપર્ક સાથે શેર થાય છે અને તે પૂરી થતાં બંધ થાય છે.",
  "citizen.contacts.how3":
    "સંપર્કો ક્યારેય તમારી જાણ, ફરિયાદો કે કંટ્રોલ રૂમ સાથેની ચેટ જોતા નથી.",
  "citizen.relation.Mother": "માતા",
  "citizen.relation.Father": "પિતા",
  "citizen.relation.Partner": "જીવનસાથી",
  "citizen.relation.Friend": "મિત્ર",
  "citizen.relation.Guardian": "વાલી",
  "citizen.relation.Sibling": "ભાઈ કે બહેન",
  "citizen.relation.Other": "અન્ય",

  // Profile
  "citizen.profile.description": "આ ઉપકરણ પર તમારી વિગતો, ભાષા અને દેખાવ.",
  "citizen.profile.verified": "ચકાસાયેલ",
  "citizen.profile.unverified": "ચકાસાયેલ નથી",
  "citizen.profile.email": "ઇમેઇલ",
  "citizen.profile.area": "સાચવેલો વિસ્તાર",
  "citizen.profile.maskedNote":
    "તમારો નંબર ઍપમાં દરેક જગ્યાએ ઢાંકેલો રહે છે, સ્ટાફની સ્ક્રીન પર પણ.",
  "citizen.profile.languageBody": "આખી નાગરિક ઍપમાં વપરાય છે.",
  "citizen.profile.device": "આ ઉપકરણ",
  "citizen.profile.signedInOn": "સાઇન ઇન થયેલું ઉપકરણ",
  "citizen.profile.signedInAt": "ક્યારથી",
  "citizen.profile.signOut": "ડેમોમાંથી સાઇન આઉટ કરો",
  "citizen.profile.signOutTitle": "ડેમોમાંથી સાઇન આઉટ કરવું છે?",
  "citizen.profile.signOutBody":
    "તમે શરૂઆતના પેજ પર પાછા જશો, જ્યાં બીજી ભૂમિકા પસંદ કરી શકાય. ડેમો માહિતી જેમ છે તેમ રહેશે.",

  // Privacy centre
  "citizen.privacy.title": "ગોપનીયતા કેન્દ્ર",
  "citizen.privacy.description":
    "આ ઍપ શું વાપરી શકે, શું શેર કરે અને કોની સાથે. તમારો દરેક ફેરફાર નીચે નોંધાય છે.",
  "citizen.privacy.deviceTitle": "પરવાનગીઓ",
  "citizen.privacy.sharingTitle": "શેરિંગ",
  "citizen.privacy.location": "લોકેશન ઍક્સેસ",
  "citizen.privacy.locationBody":
    "તમે SOS કરો, મુસાફરી શેર કરો અથવા જાણ સાથે સ્થળ જોડો ત્યારે ઍપને આ ફોનનું સ્થાન વાંચવા દે છે.",
  "citizen.privacy.camera": "કૅમેરા",
  "citizen.privacy.cameraBody":
    "ફક્ત તમે ફોટો લો અથવા વીડિયો સેશન શરૂ કરો ત્યારે વપરાય છે.",
  "citizen.privacy.microphone": "માઇક્રોફોન",
  "citizen.privacy.microphoneBody":
    "ફક્ત તમે શરૂ કરેલા વૉઇસ કે વીડિયો સેશન દરમિયાન વપરાય છે.",
  "citizen.privacy.notifications": "સૂચનાઓ",
  "citizen.privacy.notificationsBody":
    "તમારી ઇમરજન્સી, ફરિયાદો અને મુસાફરીની અપડેટ.",
  "citizen.privacy.emergencyContacts": "ઇમરજન્સી સંપર્કો",
  "citizen.privacy.emergencyContactsBody":
    "તમે SOS કરો ત્યારે તમારા વિશ્વાસુ સંપર્કોને જાણ કરવાની છૂટ આપે છે.",
  "citizen.privacy.emergencyLocation": "ઇમરજન્સી લોકેશન શેરિંગ",
  "citizen.privacy.journeySharing": "મુસાફરી શેરિંગ",
  "citizen.privacy.journeySharingBody":
    "મુસાફરી ચાલુ હોય ત્યારે તમે પસંદ કરેલા સંપર્કો સાથે તમારો માર્ગ શેર કરે છે અને તે પૂરી થતાં બંધ થાય છે.",
  "citizen.privacy.paused": "લોકેશન ઍક્સેસ બંધ હોવાથી અટકેલું છે",
  "citizen.privacy.turnedOn": "{name} ચાલુ કર્યું",
  "citizen.privacy.turnedOff": "{name} બંધ કર્યું",
  "citizen.privacy.allowed": "મંજૂર",
  "citizen.privacy.withdrawn": "પાછું ખેંચ્યું",
  "citizen.privacy.historyTitle": "સંમતિનો ઇતિહાસ",
  "citizen.privacy.historyBody":
    "તમે જ્યારે પણ પરવાનગી બદલો ત્યારે તે ફેરફાર અને સમય અહીં રખાય છે.",
  "citizen.privacy.historyEmpty": "હજુ કોઈ ફેરફાર નથી",
  "citizen.privacy.historyEmptyBody":
    "તમારી સેટિંગ તમે પહેલી વાર ઍપ ખોલી ત્યારે હતી તેવી જ છે.",
  "citizen.privacy.showAll": "બધા {count} જુઓ",
  "citizen.privacy.showFewer": "ઓછા જુઓ",
  "citizen.privacy.downloadTitle": "મારી માહિતી ડાઉનલોડ કરો",
  "citizen.privacy.downloadBody":
    "તમારી પોતાની ઇમરજન્સી, ફરિયાદો, સંપર્કો અને સંમતિની પસંદગીઓ ધરાવતી ફાઇલ.",
  "citizen.privacy.download": "મારી માહિતી ડાઉનલોડ કરો",
  "citizen.privacy.downloaded": "તમારી માહિતીની ફાઇલ ડાઉનલોડ થઈ",
  "citizen.privacy.downloadedAt":
    "{time} વાગ્યે ડાઉનલોડ થઈ. આ વિનંતી ઑડિટ લૉગમાં નોંધાઈ છે.",
  "citizen.privacy.downloadNote":
    "ફાઇલ આ ઉપકરણ પર JSON તરીકે બને છે. કશું અપલોડ થતું નથી.",
  "citizen.privacy.downloadFailed": "ફાઇલ બની શકી નહીં. ફરી પ્રયાસ કરો.",
  "citizen.privacy.count.incidents": "ઘટનાઓ",
  "citizen.privacy.count.complaints": "ફરિયાદો",
  "citizen.privacy.count.contacts": "સંપર્કો",
  "citizen.privacy.count.consents": "સંમતિ",
  "citizen.privacy.infoTitle": "ગોપનીયતા માહિતી",
  "citizen.privacy.info.collected": "શું એકત્ર થાય છે",
  "citizen.privacy.info.collectedBody":
    "તમારું નામ, ઢાંકેલો ફોન નંબર, તમે જે જાણ કરો તે, અને તમે જોડવાનું પસંદ કરો તે. પાછળથી છાની રીતે કશું એકત્ર થતું નથી.",
  "citizen.privacy.info.location": "સ્થાન ક્યારે વંચાય છે",
  "citizen.privacy.info.locationBody":
    "તમે SOS કરો ત્યારે, તમે શેર કરેલી મુસાફરી દરમિયાન, અથવા જાણમાં સ્થળ ઉમેરો ત્યારે. બીજા કોઈ સમયે નહીં.",
  "citizen.privacy.info.who": "કોણ જોઈ શકે છે",
  "citizen.privacy.info.whoBody":
    "તમારો કેસ સંભાળતા ઓપરેટર અને તમારી પાસે મોકલાયેલું યુનિટ. સ્ટાફને ટૂંકું નામ અને ઢાંકેલો નંબર દેખાય છે.",
  "citizen.privacy.info.audit":
    "સ્ટાફની ઍક્સેસ ભૂમિકા આધારિત અને ઑડિટ થયેલી છે",
  "citizen.privacy.info.auditBody":
    "દરેક સ્ટાફ ભૂમિકા ફક્ત પોતાના કામ માટે જરૂરી હોય તે જ ખોલી શકે છે, અને ખોલાયેલો દરેક રેકોર્ડ ઑડિટ લૉગમાં નોંધાય છે.",
};

const hi: Partial<Record<CitizenKey, string>> = {
  "citizen.greeting.morning": "सुप्रभात, {name}",
  "citizen.greeting.afternoon": "नमस्ते, {name}",
  "citizen.greeting.evening": "शुभ संध्या, {name}",
  "citizen.safetyStatus": "सुरक्षा स्थिति",
  "citizen.safetyStatus.normal": "सामान्य",
  "citizen.safetyStatus.active": "आपात स्थिति सक्रिय",
  "citizen.emergency.title": "आपात स्थिति?",
  "citizen.emergency.body":
    "बटन को 3 सेकंड दबाए रखें। आपकी लोकेशन कंट्रोल रूम को भेजी जाएगी।",
  "citizen.sos.hold": "SOS के लिए दबाए रखें",
  "citizen.sos.holdHint": "3 सेकंड दबाकर रखें",
  "citizen.sos.keepHolding": "दबाए रखें",
  "citizen.sos.release": "रद्द करने के लिए छोड़ दें",
  "citizen.sos.activated": "SOS सक्रिय हुआ",
  "citizen.sos.active": "आपात स्थिति सक्रिय",
  "citizen.sos.coordinating": "मदद की व्यवस्था की जा रही है",
  "citizen.sos.queued": "आपात अनुरोध कतार में है",
  "citizen.sos.queuedBody":
    "आप ऑफ़लाइन हैं। कनेक्शन मिलते ही हम इसे भेज देंगे। हो सके तो 112 पर कॉल करें।",
  "citizen.sos.viewActive": "सक्रिय आपात स्थिति खोलें",
  "citizen.sos.step.sent": "SOS भेजा गया",
  "citizen.sos.step.connected": "कंट्रोल रूम जुड़ गया",
  "citizen.sos.step.operator": "ऑपरेटर नियुक्त",
  "citizen.sos.step.unit": "पुलिस यूनिट नियुक्त",
  "citizen.sos.step.enRoute": "मदद रास्ते में है",
  "citizen.sos.step.arrived": "मदद पहुँच गई",
  "citizen.sos.operator": "ऑपरेटर",
  "citizen.sos.responder": "सहायता दल",
  "citizen.sos.eta": "अनुमानित समय",
  "citizen.sos.liveStatus": "ताज़ा स्थिति",
  "citizen.sos.voice": "वॉइस",
  "citizen.sos.video": "वीडियो",
  "citizen.sos.chat": "चैट",
  "citizen.sos.shareMedia": "मीडिया भेजें",
  "citizen.sos.trustedContact": "भरोसेमंद संपर्क",
  "citizen.sos.silentMode": "साइलेंट मोड",
  "citizen.sos.iAmSafe": "मैं सुरक्षित हूँ",
  "citizen.sos.cancel": "SOS रद्द करें",
  "citizen.sos.cancelTitle": "यह आपात स्थिति समाप्त करें?",
  "citizen.sos.cancelBody":
    "कारण बताएँ, ताकि कंट्रोल रूम को पता रहे कि आप सुरक्षित हैं।",
  "citizen.quick.police": "पुलिस सहायता",
  "citizen.quick.medical": "चिकित्सा",
  "citizen.quick.fire": "आग",
  "citizen.quick.women": "महिला सुरक्षा",
  "citizen.quick.child": "बाल सुरक्षा",
  "citizen.quick.report": "घटना की रिपोर्ट करें",
  "citizen.section.journey": "यात्रा सुरक्षा",
  "citizen.section.report": "कुछ रिपोर्ट करें",
  "citizen.section.complaints": "मेरी शिकायतें",
  "citizen.section.nearby": "नज़दीकी मदद",
  "citizen.section.contacts": "आपातकालीन संपर्क",
  "citizen.section.safetyCenter": "सुरक्षा केंद्र",
  "citizen.locationShared": "लोकेशन सहायता दल के साथ साझा हो रही है",
  "citizen.locationNotShared": "लोकेशन साझा नहीं हो रही है",
  "citizen.privacy.emergencySharing":
    "आपातकालीन लोकेशन शेयरिंग चालू होने पर, सक्रिय आपात स्थिति के दौरान आपकी लोकेशन अधिकृत सहायता दल के साथ साझा की जा सकती है।",

  // Home
  "citizen.emergency.bodyNoLocation":
    "बटन को 3 सेकंड दबाए रखें। लाइव लोकेशन बंद है, इसलिए केवल आपका सहेजा हुआ इलाका भेजा जाएगा।",
  "citizen.home.cannotHold": "दबाए नहीं रख सकते? दो टैप में पुष्टि करें",
  "citizen.home.confirmTitle": "अभी SOS भेजें?",
  "citizen.home.confirmBody":
    "आपके नाम और लोकेशन के साथ कंट्रोल रूम को तुरंत सूचना दी जाएगी।",
  "citizen.home.confirmAction": "SOS भेजें",
  "citizen.home.silent": "साइलेंट SOS",
  "citizen.home.silentTitle": "साइलेंट SOS भेजें?",
  "citizen.home.silentBody":
    "कंट्रोल रूम को सूचना मिलेगी और वे केवल चैट से जवाब देंगे। यह स्क्रीन धीमी रहेगी और कोई आवाज़ नहीं होगी। कुछ भी रिकॉर्ड नहीं होता।",
  "citizen.home.silentAction": "साइलेंट SOS भेजें",
  "citizen.home.silentActive": "साइलेंट SOS सक्रिय है",
  "citizen.home.activeBody":
    "मदद की व्यवस्था की जा रही है। ताज़ा स्थिति देखने और कंट्रोल रूम से बात करने के लिए इसे खोलें।",
  "citizen.home.sending": "भेजा जा रहा है…",
  "citizen.home.quickTitle": "किसी ख़ास तरह की मदद चाहिए?",
  "citizen.home.quickHint":
    "कुछ भी भेजने से पहले हर विकल्प आपकी पुष्टि माँगता है।",
  "citizen.home.toolsTitle": "सुरक्षा साधन",
  "citizen.home.journeyDesc": "अपनी यात्रा भरोसेमंद लोगों के साथ साझा करें",
  "citizen.home.reportDesc":
    "जो आपात स्थिति नहीं है, उसकी जानकारी पुलिस को दें",
  "citizen.home.complaintsDesc": "आपने जो रिपोर्ट किया उसकी स्थिति देखें",
  "citizen.home.nearbyDesc": "पुलिस स्टेशन, अस्पताल और फ़ायर स्टेशन",
  "citizen.home.contactsDesc": "SOS करने पर जिन्हें सूचना दी जाती है",
  "citizen.home.safetyDesc": "आम परिस्थितियों में क्या करें",
  "citizen.home.openCount": "{count} खुली",
  "citizen.home.contactsCount": "{count} सहेजे गए",

  // Quick help
  "citizen.quick.sheetTitle": "{kind}: अनुरोध की पुष्टि करें",
  "citizen.quick.policeBody":
    "पुलिस यूनिट आपके पास आए, इसके लिए आपात स्थिति दर्ज होती है।",
  "citizen.quick.medicalBody":
    "चिकित्सा आपात स्थिति दर्ज होती है। कंट्रोल रूम एम्बुलेंस की व्यवस्था करता है और सबसे नज़दीकी यूनिट भेजता है।",
  "citizen.quick.fireBody":
    "आग की आपात स्थिति दर्ज होती है। कंट्रोल रूम फ़ायर सेवा को सूचित करता है और सबसे नज़दीकी यूनिट भेजता है।",
  "citizen.quick.womenBody":
    "महिला सुरक्षा की आपात स्थिति दर्ज होती है। जहाँ उपलब्ध हो, महिला हेल्प यूनिट भेजी जाती है।",
  "citizen.quick.childBody":
    "खोए हुए, घायल या ख़तरे में पड़े बच्चे के लिए आपात स्थिति दर्ज होती है।",
  "citizen.quick.willSend": "क्या भेजा जाएगा",
  "citizen.quick.sendLocation": "आपकी अभी की लोकेशन: {place}",
  "citizen.quick.sendArea": "केवल आपका सहेजा हुआ इलाका: {place}",
  "citizen.quick.sendIdentity": "आपका नाम और छिपा हुआ फ़ोन नंबर",
  "citizen.quick.sendKind": "मदद का प्रकार: {kind}, गंभीर के रूप में चिह्नित",
  "citizen.quick.sendContacts": "भरोसेमंद संपर्कों को सूचना: {names}",
  "citizen.quick.noteLabel": "कुछ शब्द जोड़ें (वैकल्पिक)",
  "citizen.quick.notePlaceholder": "क्या हो रहा है?",
  "citizen.quick.send": "अनुरोध भेजें",
  "citizen.quick.demoNote":
    "यह एक डेमो है। असली आपातकालीन सेवाओं तक कुछ नहीं पहुँचता। असली आपात स्थिति में 112 पर कॉल करें।",

  // SOS: before it is raised
  "citizen.sos.whatHappens": "दबाए रखने पर क्या होता है",
  "citizen.sos.what1": "आपका नाम और लोकेशन कंट्रोल रूम को जाते हैं।",
  "citizen.sos.what1Off":
    "आपका नाम और सहेजा हुआ इलाका कंट्रोल रूम को जाता है। लाइव लोकेशन बंद रहती है।",
  "citizen.sos.what2": "ऑपरेटर चैट, वॉइस या वीडियो से आपके साथ रहता है।",
  "citizen.sos.what3": "सबसे नज़दीकी उपलब्ध पुलिस यूनिट आपके पास भेजी जाती है।",
  "citizen.sos.sharingOn": "आपातकालीन लोकेशन शेयरिंग चालू है",
  "citizen.sos.sharingOff": "आपातकालीन लोकेशन शेयरिंग बंद है",
  "citizen.sos.sharingOffBody":
    "सहायता दल को आपका सहेजा हुआ इलाका मिलेगा, वह जगह नहीं जहाँ आप अभी हैं।",
  "citizen.sos.openPrivacy": "गोपनीयता केंद्र खोलें",
  "citizen.sos.kbdHint": "कीबोर्ड से Space या Enter 3 सेकंड दबाए रखें।",
  "citizen.sos.alreadyActive": "आपकी एक आपात स्थिति पहले से सक्रिय है",
  "citizen.sos.contactsWillTell": "SOS करने पर {names} को सूचना दी जाएगी।",
  "citizen.sos.contactsNoneShort":
    "सूचना के लिए कोई भरोसेमंद संपर्क तय नहीं है",
  "citizen.sos.contactsOffShort": "आपातकालीन संपर्क बंद हैं",

  // SOS: raised with no connection
  "citizen.sos.fallback": "आपातकालीन वैकल्पिक रास्ते की कोशिश जारी है",
  "citizen.sos.queuedDetail":
    "अभी तक कुछ नहीं भेजा गया है। आपका अनुरोध इस फ़ोन में सहेजा हुआ है और कनेक्शन लौटते ही कंट्रोल रूम को चला जाएगा।",
  "citizen.sos.queuedNoSms":
    "आपकी ओर से कोई SMS या फ़ोन कॉल नहीं किया गया है। ऐप कनेक्शन की कोशिश करता रहता है।",
  "citizen.sos.call112": "हो सके तो 112 पर कॉल करें",
  "citizen.sos.cancelRequest": "अनुरोध रद्द करें",
  "citizen.sos.queuedSaved": "इस फ़ोन में सहेजा हुआ",
  "citizen.sos.waiting": "भेजे जाने की प्रतीक्षा",
  "citizen.sos.connection": "कनेक्शन",
  "citizen.sos.queuedLocation": "अनुरोध करते समय दर्ज की गई लोकेशन",
  "citizen.sos.queuedArea": "आपका सहेजा हुआ इलाका भेजा जाएगा",
  "citizen.sos.whileWaiting": "प्रतीक्षा के दौरान",
  "citizen.sos.whileWaiting1":
    "सुरक्षित हो तो लोगों और रोशनी वाली जगह की ओर जाएँ।",
  "citizen.sos.whileWaiting2":
    "112 पर या किसी भरोसेमंद व्यक्ति को फ़ोन करने की कोशिश करें।",
  "citizen.sos.whileWaiting3":
    "यह स्क्रीन खुली रखें। जैसे ही संभव होगा, अनुरोध अपने आप भेज दिया जाएगा।",

  // SOS: in progress
  "citizen.sos.onTheWay": "मदद रास्ते में है",
  "citizen.sos.helpArrived": "मदद पहुँच गई है",
  "citizen.sos.incidentId": "घटना ID",
  "citizen.sos.raisedAt": "दर्ज होने का समय",
  "citizen.sos.kind": "प्रकार",
  "citizen.sos.connecting": "जुड़ रहा है…",
  "citizen.sos.controlRoom": "कंट्रोल रूम",
  "citizen.sos.unit": "यूनिट {callSign}",
  "citizen.sos.responderPending": "अभी नियुक्त नहीं",
  "citizen.sos.findingUnit": "सबसे नज़दीकी यूनिट खोजी जा रही है",
  "citizen.sos.etaAbout": "लगभग {min} मिनट",
  "citizen.sos.etaEstimate": "अनुमान। यूनिट अभी रवाना नहीं हुई है।",
  "citizen.sos.etaLive": "यूनिट के बढ़ने के साथ समय घटता है",
  "citizen.sos.etaPending": "यूनिट नियुक्त होते ही समय दिखेगा।",
  "citizen.sos.arrived": "पहुँच गई",
  "citizen.sos.arriving": "पहुँच रही है",
  "citizen.sos.areaShared": "सहेजा हुआ इलाका साझा हुआ है, लाइव लोकेशन नहीं",
  "citizen.sos.mapLabel": "आपकी लोकेशन और आ रही यूनिट का नक्शा",
  "citizen.sos.more": "और विकल्प",
  "citizen.sos.chatTitle": "कंट्रोल रूम से चैट",
  "citizen.sos.chatWith": "{name} आपके साथ हैं",
  "citizen.sos.chatPlaceholder": "कंट्रोल रूम को लिखें…",
  "citizen.sos.reply.safeForNow": "मैं फ़िलहाल सुरक्षित हूँ",
  "citizen.sos.reply.stillHere": "वे अभी भी यहीं हैं",
  "citizen.sos.reply.cannotTalk": "अभी बात करना संभव नहीं है",
  "citizen.sos.reply.moved": "मैंने जगह बदल ली है",
  "citizen.sos.worseToast":
    "कंट्रोल रूम को बता दिया गया है कि स्थिति बिगड़ रही है",
  "citizen.sos.sessionVoice": "कंट्रोल रूम के साथ वॉइस सत्र",
  "citizen.sos.sessionVideo": "कंट्रोल रूम के साथ वीडियो सत्र",
  "citizen.sos.shareMediaBody":
    "कंट्रोल रूम को फ़ोटो, वीडियो या ऑडियो भेजें। वह इस आपात स्थिति से जुड़ जाता है।",
  "citizen.sos.shareMediaHint": "फ़ोटो, वीडियो या ऑडियो",
  "citizen.sos.shared": "अब तक भेजा गया",
  "citizen.sos.sharedCount": "कंट्रोल रूम को {count} भेजे गए",
  "citizen.sos.nothingShared": "अभी तक कुछ नहीं भेजा गया।",
  "citizen.sos.mediaSent": "कंट्रोल रूम को भेज दिया गया",
  "citizen.sos.contactsNotified":
    "आपके यह SOS करने पर इन संपर्कों को सूचना दी गई।",
  "citizen.sos.contactsQueued":
    "अनुरोध भेजे जाने के बाद इन संपर्कों को सूचना दी जाएगी।",
  "citizen.sos.contactsNone":
    "SOS की सूचना के लिए कोई भरोसेमंद संपर्क तय नहीं है। आप अभी जोड़ सकते हैं।",
  "citizen.sos.contactsOff":
    "आपकी गोपनीयता सेटिंग में आपातकालीन संपर्क बंद हैं, इसलिए किसी को सूचना नहीं दी गई।",
  "citizen.sos.contactsTold": "{names} को सूचना दी गई",
  "citizen.sos.contactTold": "सूचना दी गई",
  "citizen.sos.contactWaiting": "बाक़ी",
  "citizen.sos.contactsDemo":
    "इस डेमो में कोई SMS या कॉल नहीं किया जाता। ऐप केवल इन संपर्कों को सूचित दिखाता है।",
  "citizen.sos.manageContacts": "संपर्क प्रबंधित करें",
  "citizen.sos.silentModeBody":
    "यह स्क्रीन को धीमा करता है और वॉइस व वीडियो छिपा देता है। यह कुछ भी रिकॉर्ड नहीं करता।",
  "citizen.sos.stepNow": "अभी",
  "citizen.sos.stepDone": "पूरा",
  "citizen.sos.stepWaiting": "अभी बाक़ी",
  "citizen.sos.detail.sent": "लोकेशन जुड़ी · {area}",
  "citizen.sos.detail.sentArea": "सहेजा हुआ इलाका जुड़ा · {area}",
  "citizen.sos.detail.connected": "आपका अनुरोध ऑपरेटर की स्क्रीन पर है",
  "citizen.sos.detail.connecting": "कंट्रोल रूम तक पहुँच रहा है",
  "citizen.sos.detail.operator": "{name} आपके साथ हैं",
  "citizen.sos.detail.operatorPending": "ऑपरेटर यह अनुरोध ले रहे हैं",
  "citizen.sos.detail.unit": "यूनिट {callSign} · {distance} दूर",
  "citizen.sos.detail.enRoute": "यूनिट आपकी ओर आ रही है",
  "citizen.sos.detail.enRoutePending": "यूनिट की पुष्टि की प्रतीक्षा है",
  "citizen.sos.detail.arrived": "अधिकारी आपकी लोकेशन पर हैं",

  // SOS: ending it
  "citizen.sos.reason.label": "कारण",
  "citizen.sos.reason.safe": "मैं अब सुरक्षित हूँ",
  "citizen.sos.reason.safeHint": "ख़तरा टल गया है। मदद वापस बुलाई जा सकती है।",
  "citizen.sos.reason.mistake": "ग़लती से दब गया",
  "citizen.sos.reason.mistakeHint": "कोई आपात स्थिति नहीं थी।",
  "citizen.sos.reason.other": "अन्य",
  "citizen.sos.reason.otherHint": "कंट्रोल रूम को अपने शब्दों में बताएँ।",
  "citizen.sos.reason.note": "और बताएँ",
  "citizen.sos.reason.noteOptional":
    "कंट्रोल रूम को कुछ बताना हो तो (वैकल्पिक)",
  "citizen.sos.reason.required": "आगे बढ़ने के लिए कारण चुनें।",
  "citizen.sos.reason.otherRequired":
    "कुछ शब्द लिखें ताकि कंट्रोल रूम समझ सके।",
  "citizen.sos.keepActive": "आपात स्थिति सक्रिय रखें",
  "citizen.sos.endEmergency": "आपात स्थिति समाप्त करें",
  "citizen.sos.endedSafe":
    "सुरक्षित दर्ज किया गया। कंट्रोल रूम को बता दिया गया है।",
  "citizen.sos.endedCancelled": "SOS रद्द हुआ",

  // Silent mode
  "citizen.silent.title": "साइलेंट मोड",
  "citizen.silent.note":
    "यह केवल स्क्रीन का रूप बदलता है। यह ऑडियो या वीडियो रिकॉर्ड नहीं करता।",
  "citizen.silent.exit": "पूरी स्क्रीन",
  "citizen.silent.sharing": "लोकेशन साझा हो रही है",
  "citizen.silent.notSharing": "लाइव लोकेशन साझा नहीं हो रही है",

  // After an emergency
  "citizen.closure.safeTitle": "आपने ख़ुद को सुरक्षित बताया",
  "citizen.closure.cancelTitle": "SOS रद्द हुआ",
  "citizen.closure.resolvedTitle": "यह आपात स्थिति बंद हो गई है",
  "citizen.closure.body":
    "पूरा रिकॉर्ड कंट्रोल रूम के पास है। इस आपात स्थिति के लिए लोकेशन शेयरिंग बंद हो गई है।",
  "citizen.closure.ended": "समाप्त होने का समय",
  "citizen.closure.duration": "अवधि",
  "citizen.closure.reason": "दिया गया कारण",
  "citizen.closure.outcome": "नतीजा",
  "citizen.closure.whatHappened": "क्या हुआ",
  "citizen.closure.viewActivity": "गतिविधि में देखें",
  "citizen.closure.done": "हो गया",
  "citizen.closure.again": "फिर मदद चाहिए तो SOS बटन दबाए रखें।",

  // Safety centre
  "citizen.safety.title": "सुरक्षा केंद्र",
  "citizen.safety.description":
    "मुश्किल पलों के लिए छोटा, व्यावहारिक मार्गदर्शन, और मदद माँगने पर यह ऐप क्या करता है इसकी सीधी जानकारी।",
  "citizen.safety.situations": "ऐसा हो तो क्या करें",
  "citizen.safety.how": "यह ऐप कैसे मदद करता है",
  "citizen.safety.followed": "आपको लगे कि कोई आपका पीछा कर रहा है",
  "citizen.safety.followedSummary":
    "लोगों और रोशनी वाली जगह पहुँचें, फिर मदद माँगें।",
  "citizen.safety.harassment": "कोई आपको परेशान कर रहा है",
  "citizen.safety.harassmentSummary":
    "पहले दूरी बनाएँ। रिपोर्ट सुरक्षित होने के बाद भी की जा सकती है।",
  "citizen.safety.accident": "आप सड़क दुर्घटना देखें या उसमें हों",
  "citizen.safety.accidentSummary": "पहले ख़ुद सुरक्षित हों, फिर मदद बुलाएँ।",
  "citizen.safety.cyber": "आपके साथ ऑनलाइन धोखाधड़ी हुई है",
  "citizen.safety.cyberSummary": "रुकें, बैंक को फ़ोन करें, सबूत सँभालकर रखें।",
  "citizen.safety.vulnerable": "किसी बच्चे या बुज़ुर्ग को मदद चाहिए",
  "citizen.safety.vulnerableSummary":
    "दिखाई देने वाली जगह पर उनके साथ रहें और SOS करें।",
  "citizen.safety.howSos": "SOS कैसे काम करता है",
  "citizen.safety.howSosSummary": "तीन सेकंड दबाए रखें, फिर ऑपरेटर और यूनिट।",
  "citizen.safety.howSilent": "साइलेंट SOS कैसे काम करता है",
  "citizen.safety.howSilentSummary":
    "वही आपात स्थिति, शांत स्क्रीन और केवल चैट के साथ।",
  "citizen.safety.howLocation": "आपकी लोकेशन कब और कैसे इस्तेमाल होती है",
  "citizen.safety.howLocationSummary":
    "केवल तब, जब आप मदद माँगें या साझा करना चुनें।",
  "citizen.safety.goSos": "SOS पर जाएँ",
  "citizen.safety.now": "अभी मदद चाहिए?",
  "citizen.safety.nowBody": "आगे न पढ़ें। SOS खोलें और बटन दबाए रखें।",
  "citizen.safety.call112": "असली आपात स्थिति में (यह डेमो जुड़ा हुआ नहीं है)",
  "citizen.safety.helplines": "हेल्पलाइन",
  "citizen.safety.helplinesNote":
    "हेल्पलाइन नंबर हर तैनाती के अनुसार तय होते हैं। यह डेमो उन्हें न दिखाता है, न डायल करता है।",
  "citizen.safety.helpline.women": "महिला हेल्पलाइन",
  "citizen.safety.helpline.womenBody":
    "उत्पीड़न, पीछा किए जाने और घरेलू हिंसा पर सहायता और सलाह।",
  "citizen.safety.helpline.child": "बाल हेल्पलाइन",
  "citizen.safety.helpline.childBody":
    "खोए हुए, घायल या किसी से ख़तरे में पड़े बच्चे के लिए।",
  "citizen.safety.helpline.cyber": "साइबर अपराध हेल्पलाइन",
  "citizen.safety.helpline.cyberBody":
    "ऑनलाइन धोखाधड़ी और वित्तीय ठगी के लिए। लेन-देन के बाद जल्द कॉल करें।",
  "citizen.safety.helpline.senior": "वरिष्ठ नागरिक हेल्पलाइन",
  "citizen.safety.helpline.seniorBody":
    "उन बुज़ुर्गों के लिए जिन्हें सहायता चाहिए या जिनके साथ दुर्व्यवहार हो रहा है।",

  // Nearby help
  "citizen.nearby.all": "सभी",
  "citizen.nearby.police": "पुलिस",
  "citizen.nearby.hospital": "अस्पताल",
  "citizen.nearby.fire": "फ़ायर स्टेशन",
  "citizen.nearby.filter": "प्रकार के अनुसार छाँटें",
  "citizen.nearby.list": "जगहें, सबसे नज़दीकी पहले",
  "citizen.nearby.origin": "दूरी आपके सहेजे हुए इलाके {area} से",
  "citizen.nearby.drive": "सड़क से लगभग {min} मिनट",
  "citizen.nearby.inCharge": "प्रभारी: {name}",
  "citizen.nearby.note":
    "जगहें और दूरियाँ डेमो जानकारी हैं। इस स्क्रीन पर आपकी लाइव लोकेशन नहीं पढ़ी जाती।",
  "citizen.nearby.empty": "इस प्रकार की कोई जगह पास में नहीं है",
  "citizen.nearby.emptyBody": "और जगहें देखने के लिए दूसरा प्रकार चुनें।",
  "citizen.nearby.mapLabel":
    "नज़दीकी पुलिस स्टेशन, अस्पताल और फ़ायर स्टेशन का नक्शा",

  // Trusted contacts
  "citizen.contacts.description":
    "आपके भरोसेमंद लोग। हर एक के लिए आप तय करते हैं कि उन्हें कब सूचना मिले और वे आपकी लोकेशन देख सकें या नहीं।",
  "citizen.contacts.add": "संपर्क जोड़ें",
  "citizen.contacts.addTitle": "भरोसेमंद संपर्क जोड़ें",
  "citizen.contacts.editTitle": "संपर्क बदलें",
  "citizen.contacts.formBody":
    "नंबर का केवल छिपा हुआ रूप रखा और दिखाया जाता है।",
  "citizen.contacts.name": "नाम",
  "citizen.contacts.relation": "रिश्ता",
  "citizen.contacts.phone": "मोबाइल नंबर",
  "citizen.contacts.nameError": "2 से 60 अक्षरों का नाम लिखें।",
  "citizen.contacts.phoneError": "10 अंकों का भारतीय मोबाइल नंबर लिखें।",
  "citizen.contacts.phoneHelp": "10 अंक। सहेजने के बाद यह छिपा हुआ दिखेगा।",
  "citizen.contacts.phoneKeep": "सहेजा हुआ नंबर रखने के लिए ख़ाली छोड़ें।",
  "citizen.contacts.added": "संपर्क जोड़ा गया",
  "citizen.contacts.updated": "संपर्क बदला गया",
  "citizen.contacts.removed": "संपर्क हटाया गया",
  "citizen.contacts.editNamed": "{name} को बदलें",
  "citizen.contacts.removeNamed": "{name} को हटाएँ",
  "citizen.contacts.removeTitle": "{name} को हटाएँ?",
  "citizen.contacts.removeBody":
    "उन्हें अब SOS या यात्रा की सूचना नहीं मिलेगी और वे आपकी लोकेशन नहीं देख पाएँगे।",
  "citizen.contacts.remove": "संपर्क हटाएँ",
  "citizen.contacts.keep": "संपर्क रखें",
  "citizen.contacts.notifySos": "SOS पर सूचना दें",
  "citizen.contacts.notifySosBody": "आपके SOS करने पर सूचना मिलती है।",
  "citizen.contacts.notifyJourney": "यात्रा की आपात स्थिति में सूचना दें",
  "citizen.contacts.notifyJourneyBody":
    "साझा की गई यात्रा में आप मदद माँगें या चेक-इन छूट जाए तो सूचना मिलती है।",
  "citizen.contacts.shareLocation":
    "सक्रिय आपात स्थिति के दौरान लोकेशन साझा करें",
  "citizen.contacts.shareLocationBody":
    "आपात स्थिति ख़त्म होने तक देख सकते हैं कि आप कहाँ हैं।",
  "citizen.contacts.empty": "अभी कोई भरोसेमंद संपर्क नहीं है",
  "citizen.contacts.emptyBody":
    "किसी भरोसेमंद व्यक्ति को जोड़ें, ताकि आपके SOS करने पर उन्हें सूचना मिले।",
  "citizen.contacts.limit": "{max} में से {count} संपर्क सहेजे गए हैं।",
  "citizen.contacts.offTitle": "आपातकालीन संपर्क बंद हैं",
  "citizen.contacts.offBody":
    "जब तक आप गोपनीयता केंद्र में इसे चालू नहीं करते, यहाँ किसी को SOS की सूचना नहीं मिलेगी।",
  "citizen.contacts.howTitle": "संपर्कों का इस्तेमाल कैसे होता है",
  "citizen.contacts.how1":
    "संपर्क को केवल उन्हीं स्थितियों में सूचना मिलती है जो आप उनके लिए चालू करते हैं।",
  "citizen.contacts.how2":
    "लोकेशन केवल आपात स्थिति सक्रिय रहने तक संपर्क के साथ साझा होती है और उसके ख़त्म होते ही बंद हो जाती है।",
  "citizen.contacts.how3":
    "संपर्क कभी आपकी रिपोर्ट, शिकायतें या कंट्रोल रूम के साथ चैट नहीं देखते।",
  "citizen.relation.Mother": "माँ",
  "citizen.relation.Father": "पिता",
  "citizen.relation.Partner": "जीवनसाथी",
  "citizen.relation.Friend": "दोस्त",
  "citizen.relation.Guardian": "अभिभावक",
  "citizen.relation.Sibling": "भाई या बहन",
  "citizen.relation.Other": "अन्य",

  // Profile
  "citizen.profile.description": "इस डिवाइस पर आपकी जानकारी, भाषा और रूप।",
  "citizen.profile.verified": "सत्यापित",
  "citizen.profile.unverified": "सत्यापित नहीं",
  "citizen.profile.email": "ईमेल",
  "citizen.profile.area": "सहेजा हुआ इलाका",
  "citizen.profile.maskedNote":
    "आपका नंबर ऐप में हर जगह छिपा रहता है, स्टाफ़ की स्क्रीन पर भी।",
  "citizen.profile.languageBody": "पूरे नागरिक ऐप में इस्तेमाल होती है।",
  "citizen.profile.device": "यह डिवाइस",
  "citizen.profile.signedInOn": "साइन इन किया हुआ डिवाइस",
  "citizen.profile.signedInAt": "कब से",
  "citizen.profile.signOut": "डेमो से साइन आउट करें",
  "citizen.profile.signOutTitle": "डेमो से साइन आउट करें?",
  "citizen.profile.signOutBody":
    "आप शुरुआती पेज पर लौटेंगे, जहाँ दूसरी भूमिका चुनी जा सकती है। डेमो डेटा जैसा है वैसा रहेगा।",

  // Privacy centre
  "citizen.privacy.title": "गोपनीयता केंद्र",
  "citizen.privacy.description":
    "यह ऐप क्या इस्तेमाल कर सकता है, क्या साझा करता है और किसके साथ। आपका हर बदलाव नीचे दर्ज होता है।",
  "citizen.privacy.deviceTitle": "अनुमतियाँ",
  "citizen.privacy.sharingTitle": "शेयरिंग",
  "citizen.privacy.location": "लोकेशन एक्सेस",
  "citizen.privacy.locationBody":
    "जब आप SOS करें, यात्रा साझा करें या रिपोर्ट में जगह जोड़ें, तब ऐप को इस फ़ोन की लोकेशन पढ़ने देता है।",
  "citizen.privacy.camera": "कैमरा",
  "citizen.privacy.cameraBody":
    "केवल तब इस्तेमाल होता है जब आप फ़ोटो लें या वीडियो सत्र शुरू करें।",
  "citizen.privacy.microphone": "माइक्रोफ़ोन",
  "citizen.privacy.microphoneBody":
    "केवल आपके शुरू किए गए वॉइस या वीडियो सत्र के दौरान इस्तेमाल होता है।",
  "citizen.privacy.notifications": "सूचनाएँ",
  "citizen.privacy.notificationsBody":
    "आपकी आपात स्थितियों, शिकायतों और यात्राओं की अपडेट।",
  "citizen.privacy.emergencyContacts": "आपातकालीन संपर्क",
  "citizen.privacy.emergencyContactsBody":
    "आपके SOS करने पर आपके भरोसेमंद संपर्कों को सूचना देने की अनुमति देता है।",
  "citizen.privacy.emergencyLocation": "आपातकालीन लोकेशन शेयरिंग",
  "citizen.privacy.journeySharing": "यात्रा शेयरिंग",
  "citizen.privacy.journeySharingBody":
    "यात्रा सक्रिय रहने तक आपके चुने हुए संपर्कों के साथ आपका रास्ता साझा करता है और यात्रा ख़त्म होते ही बंद हो जाता है।",
  "citizen.privacy.paused": "लोकेशन एक्सेस बंद होने से रुका हुआ है",
  "citizen.privacy.turnedOn": "{name} चालू किया गया",
  "citizen.privacy.turnedOff": "{name} बंद किया गया",
  "citizen.privacy.allowed": "अनुमति दी",
  "citizen.privacy.withdrawn": "वापस ली",
  "citizen.privacy.historyTitle": "सहमति का इतिहास",
  "citizen.privacy.historyBody":
    "आप जब भी कोई अनुमति बदलते हैं, वह बदलाव और समय यहाँ रखा जाता है।",
  "citizen.privacy.historyEmpty": "अभी कोई बदलाव नहीं",
  "citizen.privacy.historyEmptyBody":
    "आपकी सेटिंग वैसी ही हैं जैसी पहली बार ऐप खोलने पर थीं।",
  "citizen.privacy.showAll": "सभी {count} देखें",
  "citizen.privacy.showFewer": "कम देखें",
  "citizen.privacy.downloadTitle": "मेरा डेटा डाउनलोड करें",
  "citizen.privacy.downloadBody":
    "आपकी अपनी आपात स्थितियों, शिकायतों, संपर्कों और सहमति के विकल्पों वाली फ़ाइल।",
  "citizen.privacy.download": "मेरा डेटा डाउनलोड करें",
  "citizen.privacy.downloaded": "आपकी डेटा फ़ाइल डाउनलोड हो गई",
  "citizen.privacy.downloadedAt":
    "{time} बजे डाउनलोड हुई। यह अनुरोध ऑडिट लॉग में दर्ज है।",
  "citizen.privacy.downloadNote":
    "फ़ाइल इसी डिवाइस पर JSON के रूप में बनती है। कुछ भी अपलोड नहीं होता।",
  "citizen.privacy.downloadFailed": "फ़ाइल नहीं बन सकी। फिर कोशिश करें।",
  "citizen.privacy.count.incidents": "घटनाएँ",
  "citizen.privacy.count.complaints": "शिकायतें",
  "citizen.privacy.count.contacts": "संपर्क",
  "citizen.privacy.count.consents": "सहमति",
  "citizen.privacy.infoTitle": "गोपनीयता जानकारी",
  "citizen.privacy.info.collected": "क्या एकत्र किया जाता है",
  "citizen.privacy.info.collectedBody":
    "आपका नाम, छिपा हुआ फ़ोन नंबर, आप जो रिपोर्ट करते हैं, और जो कुछ आप जोड़ना चुनें। पृष्ठभूमि में कुछ भी एकत्र नहीं होता।",
  "citizen.privacy.info.location": "लोकेशन कब पढ़ी जाती है",
  "citizen.privacy.info.locationBody":
    "जब आप SOS करें, आपकी साझा की हुई यात्रा के दौरान, या जब आप रिपोर्ट में जगह जोड़ें। और किसी समय नहीं।",
  "citizen.privacy.info.who": "कौन देख सकता है",
  "citizen.privacy.info.whoBody":
    "आपका मामला सँभाल रहा ऑपरेटर और आपके पास भेजी गई यूनिट। स्टाफ़ को छोटा नाम और छिपा हुआ नंबर दिखता है।",
  "citizen.privacy.info.audit":
    "स्टाफ़ की पहुँच भूमिका-आधारित और ऑडिट की हुई है",
  "citizen.privacy.info.auditBody":
    "हर स्टाफ़ भूमिका केवल वही खोल सकती है जो उसके काम के लिए ज़रूरी है, और खोला गया हर रिकॉर्ड ऑडिट लॉग में दर्ज होता है।",
};

export const citizen = { en, gu, hi };
