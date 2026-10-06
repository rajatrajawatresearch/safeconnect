/**
 * Field officer app strings beyond the shared ones in `staff.ts`.
 * Add keys here (English first, then gu and hi).
 */
const en = {
  "officer.status": "Status",
  "officer.unit": "Unit",

  "officer.vehicle": "Vehicle",
  "officer.shiftEndsIn": "Shift ends in",
  "officer.available": "Available",
  "officer.unavailable": "Unavailable",
  "officer.statusLocked":
    "Your status follows the assignment while you are responding.",
  "officer.viewAssignment": "View assignment",
  "officer.continue": "Continue response",
  "officer.noAssignment": "No assignment right now",
  "officer.noAssignmentBody":
    "You will be alerted here the moment the control room assigns your unit.",
  "officer.requestDemo": "Request a demo assignment",
  "officer.patrol": "Patrol",
  "officer.messages": "Messages",
  "officer.nearby": "Nearby incidents",
  "officer.reports": "Reports",
  "officer.reportsDue": "Reports due",

  "officer.priority": "Priority",
  "officer.distance": "Distance",
  "officer.eta": "ETA",
  "officer.away": "{distance} away",
  "officer.elapsed": "Elapsed",
  "officer.contact": "Contact",
  "officer.openInMaps": "Open in maps",
  "officer.updateIncident": "Update incident",
  "officer.situationControlled": "Situation controlled",
  "officer.completeResponse": "Complete response",
  "officer.fieldNote": "Field note",
  "officer.addNote": "Add note",
  "officer.addEvidence": "Add evidence",
  "officer.backupRequested": "Backup requested",
  "officer.chatOnly": "Chat only. Do not call.",
  "officer.assistantSummary": "Assistant summary",
  "officer.advisory": "Advisory. An operator confirms priority and category.",

  "officer.intelligence": "Incident intelligence",
  "officer.description": "Description",
  "officer.location": "Location",
  "officer.timeline": "Timeline",
  "officer.evidence": "Relevant evidence",
  "officer.controlNotes": "Control room notes",
  "officer.citizenComms": "Citizen communication",

  "officer.stage.assigned": "Assigned",
  "officer.stage.accepted": "Accepted",
  "officer.stage.en_route": "En route",
  "officer.stage.on_scene": "On scene",
  "officer.stage.assistance_requested": "Assistance requested",
  "officer.stage.situation_controlled": "Situation controlled",
  "officer.stage.report_pending": "Report pending",
  "officer.stage.completed": "Completed",

  "officer.myIncidents": "My incidents",
  "officer.filter.active": "Active",
  "officer.filter.completed": "Completed",
  "officer.filter.nearby": "Nearby",

  "officer.tab.controlRoom": "Control room",
  "officer.tab.citizen": "Citizen",

  "officer.writeReport": "Write report",
  "officer.submitReport": "Submit report",
  "officer.submittedReports": "Submitted reports",
  "officer.handoff": "Case hand-off",
  "officer.notFir":
    "This is a preliminary response report in a demonstration. It is not an FIR or any statutory filing.",
} as const;

export type OfficerKey = keyof typeof en;

const gu: Partial<Record<OfficerKey, string>> = {
  "officer.status": "સ્થિતિ",
  "officer.unit": "યુનિટ",

  "officer.vehicle": "વાહન",
  "officer.shiftEndsIn": "શિફ્ટ પૂરી થવામાં",
  "officer.available": "ઉપલબ્ધ",
  "officer.unavailable": "અનુપલબ્ધ",
  "officer.statusLocked": "પ્રતિસાદ દરમિયાન તમારી સ્થિતિ સોંપણી મુજબ રહે છે.",
  "officer.viewAssignment": "સોંપણી જુઓ",
  "officer.continue": "પ્રતિસાદ ચાલુ રાખો",
  "officer.noAssignment": "હાલ કોઈ સોંપણી નથી",
  "officer.noAssignmentBody":
    "કંટ્રોલ રૂમ તમારા યુનિટને સોંપણી આપે કે તરત અહીં જાણ થશે.",
  "officer.requestDemo": "ડેમો સોંપણી માગો",
  "officer.patrol": "પેટ્રોલિંગ",
  "officer.messages": "સંદેશા",
  "officer.nearby": "નજીકની ઘટનાઓ",
  "officer.reports": "અહેવાલ",
  "officer.reportsDue": "બાકી અહેવાલ",

  "officer.priority": "અગ્રતા",
  "officer.distance": "અંતર",
  "officer.eta": "અંદાજિત સમય",
  "officer.away": "{distance} દૂર",
  "officer.elapsed": "વીતેલો સમય",
  "officer.contact": "સંપર્ક",
  "officer.openInMaps": "નકશામાં ખોલો",
  "officer.updateIncident": "ઘટના અપડેટ કરો",
  "officer.situationControlled": "પરિસ્થિતિ કાબૂમાં",
  "officer.completeResponse": "પ્રતિસાદ પૂર્ણ કરો",
  "officer.fieldNote": "સ્થળ નોંધ",
  "officer.addNote": "નોંધ ઉમેરો",
  "officer.addEvidence": "પુરાવો ઉમેરો",
  "officer.backupRequested": "વધારાની મદદ માગી છે",
  "officer.chatOnly": "માત્ર ચેટ. કૉલ ન કરો.",
  "officer.assistantSummary": "સહાયક સારાંશ",
  "officer.advisory": "માત્ર સલાહરૂપ. અગ્રતા અને શ્રેણી ઓપરેટર નક્કી કરે છે.",

  "officer.intelligence": "ઘટનાની માહિતી",
  "officer.description": "વર્ણન",
  "officer.location": "સ્થળ",
  "officer.timeline": "સમયરેખા",
  "officer.evidence": "સંબંધિત પુરાવા",
  "officer.controlNotes": "કંટ્રોલ રૂમની નોંધો",
  "officer.citizenComms": "નાગરિક સાથે સંપર્ક",

  "officer.stage.assigned": "સોંપાયું",
  "officer.stage.accepted": "સ્વીકાર્યું",
  "officer.stage.en_route": "રસ્તામાં",
  "officer.stage.on_scene": "સ્થળ પર",
  "officer.stage.assistance_requested": "મદદ માગી",
  "officer.stage.situation_controlled": "પરિસ્થિતિ કાબૂમાં",
  "officer.stage.report_pending": "અહેવાલ બાકી",
  "officer.stage.completed": "પૂર્ણ",

  "officer.myIncidents": "મારી ઘટનાઓ",
  "officer.filter.active": "સક્રિય",
  "officer.filter.completed": "પૂર્ણ",
  "officer.filter.nearby": "નજીકની",

  "officer.tab.controlRoom": "કંટ્રોલ રૂમ",
  "officer.tab.citizen": "નાગરિક",

  "officer.writeReport": "અહેવાલ લખો",
  "officer.submitReport": "અહેવાલ સબમિટ કરો",
  "officer.submittedReports": "સબમિટ કરેલા અહેવાલ",
  "officer.handoff": "કેસ હેન્ડ-ઓફ",
  "officer.notFir":
    "આ ડેમોમાંનો પ્રાથમિક પ્રતિસાદ અહેવાલ છે. તે FIR કે કોઈ કાયદેસરની નોંધણી નથી.",
};

const hi: Partial<Record<OfficerKey, string>> = {
  "officer.status": "स्थिति",
  "officer.unit": "यूनिट",

  "officer.vehicle": "वाहन",
  "officer.shiftEndsIn": "शिफ़्ट समाप्त होने में",
  "officer.available": "उपलब्ध",
  "officer.unavailable": "अनुपलब्ध",
  "officer.statusLocked":
    "प्रतिक्रिया के दौरान आपकी स्थिति असाइनमेंट के अनुसार रहती है।",
  "officer.viewAssignment": "असाइनमेंट देखें",
  "officer.continue": "प्रतिक्रिया जारी रखें",
  "officer.noAssignment": "अभी कोई असाइनमेंट नहीं",
  "officer.noAssignmentBody":
    "कंट्रोल रूम आपकी यूनिट को असाइन करते ही यहाँ सूचना मिलेगी।",
  "officer.requestDemo": "डेमो असाइनमेंट माँगें",
  "officer.patrol": "गश्त",
  "officer.messages": "संदेश",
  "officer.nearby": "आस-पास की घटनाएँ",
  "officer.reports": "रिपोर्ट",
  "officer.reportsDue": "लंबित रिपोर्ट",

  "officer.priority": "प्राथमिकता",
  "officer.distance": "दूरी",
  "officer.eta": "अनुमानित समय",
  "officer.away": "{distance} दूर",
  "officer.elapsed": "बीता समय",
  "officer.contact": "संपर्क",
  "officer.openInMaps": "मानचित्र में खोलें",
  "officer.updateIncident": "घटना अपडेट करें",
  "officer.situationControlled": "स्थिति नियंत्रण में",
  "officer.completeResponse": "प्रतिक्रिया पूरी करें",
  "officer.fieldNote": "मौके का नोट",
  "officer.addNote": "नोट जोड़ें",
  "officer.addEvidence": "साक्ष्य जोड़ें",
  "officer.backupRequested": "अतिरिक्त बल माँगा गया",
  "officer.chatOnly": "केवल चैट। कॉल न करें।",
  "officer.assistantSummary": "सहायक सारांश",
  "officer.advisory":
    "केवल सलाह। प्राथमिकता और श्रेणी की पुष्टि ऑपरेटर करता है।",

  "officer.intelligence": "घटना की जानकारी",
  "officer.description": "विवरण",
  "officer.location": "स्थान",
  "officer.timeline": "समयरेखा",
  "officer.evidence": "संबंधित साक्ष्य",
  "officer.controlNotes": "कंट्रोल रूम के नोट",
  "officer.citizenComms": "नागरिक से संचार",

  "officer.stage.assigned": "असाइन",
  "officer.stage.accepted": "स्वीकृत",
  "officer.stage.en_route": "रास्ते में",
  "officer.stage.on_scene": "मौके पर",
  "officer.stage.assistance_requested": "सहायता माँगी गई",
  "officer.stage.situation_controlled": "स्थिति नियंत्रण में",
  "officer.stage.report_pending": "रिपोर्ट लंबित",
  "officer.stage.completed": "पूर्ण",

  "officer.myIncidents": "मेरी घटनाएँ",
  "officer.filter.active": "सक्रिय",
  "officer.filter.completed": "पूर्ण",
  "officer.filter.nearby": "आस-पास",

  "officer.tab.controlRoom": "कंट्रोल रूम",
  "officer.tab.citizen": "नागरिक",

  "officer.writeReport": "रिपोर्ट लिखें",
  "officer.submitReport": "रिपोर्ट जमा करें",
  "officer.submittedReports": "जमा की गई रिपोर्ट",
  "officer.handoff": "केस हैंड-ऑफ़",
  "officer.notFir":
    "यह डेमो में एक प्रारंभिक प्रतिक्रिया रिपोर्ट है। यह FIR या कोई वैधानिक दर्ज नहीं है।",
};

export const officer = { en, gu, hi };
