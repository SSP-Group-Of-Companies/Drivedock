import { ICompetencyQuestion } from "@/types/applicationForm.types";

/**
 * Generate competency questions with translation keys
 * The actual text will be resolved using the translation hook in components
 */
export const getCompetencyQuestions = (t: (key: string) => string): ICompetencyQuestion[] => {
  const questionIds = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15", "16", "17", "18"];

  return questionIds.map((questionId) => {
    const questionKey = `form.step2.page5.questions.${questionId}`;
    const questionText = t(`${questionKey}.question`);

    // Get options dynamically based on what's available in translations
    const options: { id: string; value: string }[] = [];
    const optionIds = ["a", "b", "c", "d"];

    optionIds.forEach((optionId) => {
      const optionKey = `${questionKey}.options.${optionId}`;
      const optionText = t(optionKey);
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

/** Correct answers mapped to the sheet in the photo */
function getCorrectAnswer(questionId: string): string {
  const correct: Record<string, string> = {
    "1": "d",
    "2": "a",
    "3": "c",
    "4": "a",
    "5": "a",
    "6": "b",
    "7": "c",
    "8": "c",
    "9": "b",
    "10": "d",
    "11": "c",
    "12": "c",
    "13": "d",
    "14": "b",
    "15": "b",
    "16": "c",
    "17": "a",
    "18": "a",
  };
  return correct[questionId] || "a";
}

// ---------- Static version for backend use (no translations) ----------
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
    questionText: "According to FMCSA, you may not work for more than how many hours in 8 days:",
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
    questionText: "After 11 hours of driving time, you must",
    options: [
      { id: "a", value: "Stop working and go home" },
      { id: "b", value: "Can work 5 more hours" },
      { id: "c", value: "Get 10 consecutive hours of rest before driving again" },
      { id: "d", value: "All the above" },
    ],
    correctAnswerId: "c",
  },
  {
    questionId: "4",
    questionText: "During pre-trip inspection, you must show that the",
    options: [
      { id: "a", value: "The vehicle is safe to drive" },
      { id: "b", value: "The vehicle is newer than 4 years" },
      { id: "c", value: "You are competent and have no alcohol in the system" },
      { id: "d", value: "All the above" },
    ],
    correctAnswerId: "a",
  },
  {
    questionId: "5",
    questionText: "Cognitive load while you drive refers to:",
    options: [
      { id: "a", value: "How much work your brain is doing" },
      { id: "b", value: "Your ability to make decisions" },
      { id: "c", value: "The number of hazards you can see" },
    ],
    correctAnswerId: "a",
  },
  {
    questionId: "6",
    questionText: "Using hands-free mode on a mobile device while driving:",
    options: [
      { id: "a", value: "Increases cognitive load" },
      { id: "b", value: "Decreases cognitive load" },
      { id: "c", value: "Does not affect cognitive load" },
    ],
    correctAnswerId: "b",
  },
  {
    questionId: "7",
    questionText: "During the pre-trip inspection, you will",
    options: [
      { id: "a", value: "Sit in the truck and drive around talking about your expertise" },
      { id: "b", value: "Take a computerized test about truck driving" },
      { id: "c", value: "Walk around the vehicle and point to or touch each item and explain to the examiner what you are checking and why" },
    ],
    correctAnswerId: "c",
  },
  {
    questionId: "8",
    questionText: "During pre-trip inspection, the mirror and windscreen should be checked for",
    options: [
      { id: "a", value: "Proper alignment" },
      { id: "b", value: "Stickers" },
      { id: "c", value: "Cleanliness, obstruction, and damage" },
    ],
    correctAnswerId: "c",
  },
  {
    questionId: "9",
    questionText: "What is meant by C-TPAT?",
    options: [
      { id: "a", value: "Canadian Transportation Participation Against Terrorism" },
      { id: "b", value: "Customs Trade Partnership Against Terrorism" },
      { id: "c", value: "Canadian Trade Partnership Against Terrorism" },
      { id: "d", value: "Customs Trade Partnership and Transportation" },
    ],
    correctAnswerId: "b",
  },
  {
    questionId: "10",
    questionText: "If a driver finds trailer’s seal broken at a truck stop, he must",
    options: [
      { id: "a", value: "Report to dispatch immediately" },
      { id: "b", value: "Re-inspect his equipment for any suspicious behavior" },
      { id: "c", value: "Should put another seal" },
      { id: "d", value: "All the above" },
    ],
    correctAnswerId: "d",
  },
  {
    questionId: "11",
    questionText: "When a driver receives notice of license or permits revocation/suspension he/she must",
    options: [
      { id: "a", value: "Notify the carrier within 72 hours" },
      { id: "b", value: "Notify the carrier within a week" },
      { id: "c", value: "Notify the carrier immediately" },
      { id: "d", value: "Take no action since the carrier will get notification" },
    ],
    correctAnswerId: "c",
  },
  {
    questionId: "12",
    questionText: "The maximum legal gross weight a tandem combination is permitted in the US:",
    options: [
      { id: "a", value: "90000 Lbs." },
      { id: "b", value: "84000 Lbs." },
      { id: "c", value: "80000 Lbs." },
      { id: "d", value: "15000 Lbs. per axle" },
    ],
    correctAnswerId: "c",
  },
  {
    questionId: "13",
    questionText: "You may reset your 70-hour cycle by having at least how many hours off duty in Canada:",
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
    questionId: "15",
    questionText: "Empty trailers crossing borders do not require bolt seal.",
    options: [
      { id: "a", value: "True" },
      { id: "b", value: "False" },
    ],
    correctAnswerId: "b",
  },
  {
    questionId: "16",
    questionText: "Who should be putting the seal on the trailer?",
    options: [
      { id: "a", value: "Anyone" },
      { id: "b", value: "Dispatch" },
      { id: "c", value: "Shipper" },
      { id: "d", value: "Security Guard" },
    ],
    correctAnswerId: "c",
  },
  {
    questionId: "17",
    questionText: "A general rule for any inspection point during a security inspection is to look for:",
    options: [
      { id: "a", value: "Signs of tampering" },
      { id: "b", value: "Evidence of drugs" },
      { id: "c", value: "Areas in need of repair" },
    ],
    correctAnswerId: "a",
  },
  {
    questionId: "18",
    questionText: "The last step of affixing a security seal to a trailer or container is to:",
    options: [
      { id: "a", value: "Pull down on the seal to confirm that it is secure" },
      { id: "b", value: "Twist the seal to see if it comes off" },
      { id: "c", value: "Double check the seal number matches your documentation" },
    ],
    correctAnswerId: "a",
  },
];
