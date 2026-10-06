/**
 * Officer, control room, command and admin strings.
 * Staff consoles are English-first in the prototype; the headline labels below are translated to
 * show the mechanism. Add keys here (English first, then gu and hi) as screens are localised.
 */
const en = {
  "officer.onDuty": "On duty",
  "officer.offDuty": "Off duty",
  "officer.newAssignment": "New assignment",
  "officer.activeIncident": "Active incident",
  "officer.accept": "Accept",
  "officer.decline": "Decline",
  "officer.navigate": "Navigate",
  "officer.arrived": "Arrived",
  "officer.requestBackup": "Request backup",
  "officer.contactCitizen": "Contact citizen",
  "officer.controlRoom": "Control room",
  "control.activeEmergencies": "Active emergencies",
  "control.criticalIncidents": "Critical incidents",
  "control.unitsAvailable": "Units available",
  "control.unitsEnRoute": "Units en route",
  "control.avgResponse": "Average response time",
  "control.unassigned": "Unassigned incidents",
  "control.liveFeed": "Live incident feed",
  "control.assignUnit": "Assign unit",
  "control.resolve": "Resolve",
  "control.escalate": "Escalate",
  "command.resolvedToday": "Resolved today",
  "command.historicalDensity": "Historical incident density",
} as const;

export type StaffKey = keyof typeof en;

const gu: Partial<Record<StaffKey, string>> = {
  "officer.onDuty": "ફરજ પર",
  "officer.offDuty": "ફરજ બહાર",
  "officer.newAssignment": "નવી સોંપણી",
  "officer.activeIncident": "ચાલુ ઘટના",
  "officer.accept": "સ્વીકારો",
  "officer.decline": "નકારો",
  "officer.navigate": "માર્ગ બતાવો",
  "officer.arrived": "પહોંચી ગયા",
  "officer.requestBackup": "વધારાની મદદ માગો",
  "officer.contactCitizen": "નાગરિકનો સંપર્ક",
  "officer.controlRoom": "કંટ્રોલ રૂમ",
  "control.activeEmergencies": "સક્રિય ઇમરજન્સી",
  "control.criticalIncidents": "અતિ ગંભીર ઘટનાઓ",
  "control.unitsAvailable": "ઉપલબ્ધ યુનિટ",
  "control.unitsEnRoute": "રસ્તામાં યુનિટ",
  "control.avgResponse": "સરેરાશ પ્રતિસાદ સમય",
  "control.unassigned": "સોંપ્યા વગરની ઘટનાઓ",
  "control.liveFeed": "લાઇવ ઘટના ફીડ",
  "control.assignUnit": "યુનિટ સોંપો",
  "control.resolve": "ઉકેલો",
  "control.escalate": "એસ્કેલેટ કરો",
  "command.resolvedToday": "આજે ઉકેલાયેલ",
  "command.historicalDensity": "ભૂતકાળની ઘટનાઓની ગીચતા",
};

const hi: Partial<Record<StaffKey, string>> = {
  "officer.onDuty": "ड्यूटी पर",
  "officer.offDuty": "ड्यूटी से बाहर",
  "officer.newAssignment": "नया असाइनमेंट",
  "officer.activeIncident": "सक्रिय घटना",
  "officer.accept": "स्वीकार करें",
  "officer.decline": "अस्वीकार करें",
  "officer.navigate": "रास्ता दिखाएँ",
  "officer.arrived": "पहुँच गए",
  "officer.requestBackup": "अतिरिक्त बल माँगें",
  "officer.contactCitizen": "नागरिक से संपर्क",
  "officer.controlRoom": "कंट्रोल रूम",
  "control.activeEmergencies": "सक्रिय आपात स्थितियाँ",
  "control.criticalIncidents": "अति गंभीर घटनाएँ",
  "control.unitsAvailable": "उपलब्ध यूनिट",
  "control.unitsEnRoute": "रास्ते में यूनिट",
  "control.avgResponse": "औसत प्रतिक्रिया समय",
  "control.unassigned": "बिना असाइन की घटनाएँ",
  "control.liveFeed": "लाइव घटना फ़ीड",
  "control.assignUnit": "यूनिट असाइन करें",
  "control.resolve": "समाधान करें",
  "control.escalate": "एस्केलेट करें",
  "command.resolvedToday": "आज सुलझाई गईं",
  "command.historicalDensity": "पिछली घटनाओं का घनत्व",
};

export const staff = { en, gu, hi };
