import { ICompetencyQuestion } from "@/types/applicationForm.types";

/**
 * Generate competency questions with translation keys
 * The actual text will be resolved using the translation hook in components
 */
export const getCompetencyQuestions = (t: (key: string) => string): ICompetencyQuestion[] => {
  const questionIds = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20", "21"];
  
  return questionIds.map(questionId => {
    const questionKey = `form.step2.page5.questions.${questionId}`;
    const questionText = t(`${questionKey}.question`);
    
    // Get options dynamically based on what's available in translations
    const options: { id: string; value: string }[] = [];
    const optionIds = ["a", "b", "c", "d"];
    
    optionIds.forEach(optionId => {
      const optionKey = `${questionKey}.options.${optionId}`;
      const optionText = t(optionKey);
      
      // Only add option if translation exists (not the fallback key)
      if (optionText !== optionKey) {
        options.push({ id: optionId, value: optionText });
      }
    });
    
    return {
      questionId,
      questionText,
      options,
      correctAnswerId: getCorrectAnswer(questionId),
    };
  });
};

/**
 * Get the correct answer for each question
 * This maintains the same logic as before but in a cleaner format
 */
function getCorrectAnswer(questionId: string): string {
  const correctAnswers: Record<string, string> = {
    "1": "d",
    "2": "a", 
    "3": "c",
    "4": "a",
    "5": "b",
    "6": "c",
    "7": "c",
    "8": "b",
    "9": "d",
    "10": "d",
    "11": "b",
    "12": "c",
    "13": "d",
    "14": "d",
    "15": "b",
    "16": "b",
    "17": "c",
    "18": "c",
    "19": "a",
    "20": "d",
    "21": "d",
  };
  
  return correctAnswers[questionId] || "a";
}

// Static version for backend use (no translations)
export const competencyQuestions: ICompetencyQuestion[] = [
  {
    questionId: "1",
    questionText: "According to FMCSA, you may not drive for more than:",
    options: [
      { id: "a", value: "11 Hours" },
      { id: "b", value: "After being on duty for 14 hours" },
      { id: "c", value: "After being on duty for more than 8 hours following continuous 10 hours off duty" },
      { id: "d", value: "All of the above" },
    ],
    correctAnswerId: "d",
  },
  {
    questionId: "2",
    questionText: "According to FMCSA, you may not work for more than ____ hours in 8 days:",
    options: [
      { id: "a", value: "70 Hours" },
      { id: "b", value: "120 Hours" },
      { id: "c", value: "11 hours" },
      { id: "d", value: "500 miles round trip" },
    ],
    correctAnswerId: "a",
  },
  {
    questionId: "3",
    questionText: "After 11 hours of driving time you must",
    options: [
      { id: "a", value: "Stop working and go home" },
      { id: "b", value: "Can work 5 more hours" },
      { id: "c", value: "Get 10 consecutive hours of rest before driving again" },
      { id: "d", value: "All of the above" },
    ],
    correctAnswerId: "c",
  },
  {
    questionId: "4",
    questionText: "In Canada you may have two extra hours of driving time in addition to the 14 hours shift rule if",
    options: [
      { id: "a", value: "Weather/driving conditions interfere with the ability to perform duties within 11 hours of and you could not foresee them before you set out" },
      { id: "b", value: "You use the split-breaking option" },
      { id: "c", value: "You get 6 consecutive hours of rest between driving periods" },
      { id: "d", value: "All of the above" },
    ],
    correctAnswerId: "a",
  },
  {
    questionId: "5",
    questionText: "During pre-trip inspection you must show that the",
    options: [
      { id: "a", value: "The vehicle is safe to drive" },
      { id: "b", value: "The vehicle is newer than 4 years" },
      { id: "c", value: "You are competent and have no alcohol in the system" },
    ],
    correctAnswerId: "b",
  },
  {
    questionId: "6",
    questionText: "During the pre-trip inspection you will",
    options: [
      { id: "a", value: "Sit in the truck and drive around talking about your expertise" },
      { id: "b", value: "Take a computerized test about truck driving" },
      { id: "c", value: "Walk around the vehicle and point out to the coach each item and explain to the examiner what you are checking and why" },
    ],
    correctAnswerId: "c",
  },
  {
    questionId: "7",
    questionText: "During pre-trip inspection the mirror and windscreen should be checked for",
    options: [
      { id: "a", value: "Proper alignment" },
      { id: "b", value: "Stickers" },
      { id: "c", value: "Cleanliness, obstruction and damage" },
    ],
    correctAnswerId: "c",
  },
  {
    questionId: "8",
    questionText: "What is meant by C-TPAT",
    options: [
      { id: "a", value: "Canadian Transportation Participation Against Terrorism" },
      { id: "b", value: "Customs Trade Partnership Against Terrorism" },
      { id: "c", value: "Canadian Trade Partnership Against Terrorism" },
    ],
    correctAnswerId: "b",
  },
  {
    questionId: "9",
    questionText: "While doing trailer inspection which of the following should make you suspicious",
    options: [
      { id: "a", value: "Abnormal noise while knocking the door" },
      { id: "b", value: "Fresh paint on any component" },
      { id: "c", value: "Glue on tire" },
      { id: "d", value: "All of the above" },
    ],
    correctAnswerId: "d",
  },
  {
    questionId: "10",
    questionText: "If a driver finds trailers seal broken at a truck stop he must",
    options: [
      { id: "a", value: "Report to dispatch immediately" },
      { id: "b", value: "Re-inspect his equipment for any suspicious behavior" },
      { id: "c", value: "Should put another seal" },
      { id: "d", value: "All of the above" },
    ],
    correctAnswerId: "d",
  },
  {
    questionId: "11",
    questionText: "When a driver receives notice of license or permit revocation, suspension he must",
    options: [
      { id: "a", value: "Notify the carrier within 72 hours" },
      { id: "b", value: "Notify the carrier within a week" },
      { id: "c", value: "Notify the carrier immediately" },
      { id: "d", value: "Take no action since the carrier will get notification" },
    ],
    correctAnswerId: "b",
  },
  {
    questionId: "12",
    questionText: "The maximum gross weight a tandem combination is permitted in the US",
    options: [
      { id: "a", value: "90000 Lbs" },
      { id: "b", value: "84000 Lbs" },
      { id: "c", value: "80000 Lbs" },
      { id: "d", value: "15000 Lbs per axle" },
    ],
    correctAnswerId: "c",
  },
  {
    questionId: "13",
    questionText: "You may reset your 70 hour cycle by having at-least ____ hours off duty in Canada",
    options: [
      { id: "a", value: "10" },
      { id: "b", value: "24" },
      { id: "c", value: "32" },
      { id: "d", value: "36" },
    ],
    correctAnswerId: "d",
  },
  {
    questionId: "14",
    questionText: "If you are inspected and put OOS at a road side inspection for any reason you must",
    options: [
      { id: "a", value: "Accurately log the event in your book and continue your trip" },
      { id: "b", value: "Not leave the inspection station until you have accumulated enough hours to drive again" },
      { id: "c", value: "Inform your carrier of the incident" },
      { id: "d", value: "All of the above" },
    ],
    correctAnswerId: "d",
  },
  {
    questionId: "15",
    questionText: "A driver may not drive faster than the posted speed limit",
    options: [
      { id: "a", value: "Unless the driver is sick and must complete the run quickly to see a doctor" },
      { id: "b", value: "At any time" },
      { id: "c", value: "During the day as you can see things clearly" },
      { id: "d", value: "Unless the driver is late and is making for the time lost" },
    ],
    correctAnswerId: "b",
  },
  {
    questionId: "16",
    questionText: "Empty trailer crossing border do not require bolt seal",
    options: [
      { id: "a", value: "True" },
      { id: "b", value: "False" },
    ],
    correctAnswerId: "b",
  },
  {
    questionId: "17",
    questionText: "When should an inspection be completed",
    options: [
      { id: "a", value: "Any time during the trip" },
      { id: "b", value: "Pre and Post trip" },
      { id: "c", value: "Before you reach the border" },
      { id: "d", value: "If dispatch asks you to do" },
    ],
    correctAnswerId: "c",
  },
  {
    questionId: "18",
    questionText: "What should you do if you find an un-authorized person on the premises",
    options: [
      { id: "a", value: "Call the police" },
      { id: "b", value: "Call dispatch" },
      { id: "c", value: "Talk to person" },
      { id: "d", value: "Don't do anything" },
    ],
    correctAnswerId: "c",
  },
  {
    questionId: "19",
    questionText: "Who should be putting the seal on the trailer",
    options: [
      { id: "a", value: "Anyone" },
      { id: "b", value: "Dispatch" },
    ],
    correctAnswerId: "a",
  },
  {
    questionId: "20",
    questionText: "Who should be contacted if you detect tampering on your truck or trailer",
    options: [
      { id: "a", value: "Call the other driver who is senior in the company" },
      { id: "b", value: "Call police" },
      { id: "c", value: "Go to border and tell customs" },
      { id: "d", value: "Call dispatch" },
    ],
    correctAnswerId: "d",
  },
  {
    questionId: "21",
    questionText: "What kind of seal should be put on trailer",
    options: [
      { id: "a", value: "Plastic" },
      { id: "b", value: "Bolt" },
      { id: "c", value: "Metal" },
      { id: "d", value: "Certified ISA PAS 17712 seals" },
    ],
    correctAnswerId: "d",
  }
];