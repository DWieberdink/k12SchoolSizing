// formulas.js

// Full P1–P68 logic
export function computeGuidelineRoomValues(inputs) {
  const {
    totalEnrollment,
    spedTotal,
    sectionSize,
    instructionCycles,
    sectionCsvRows
  } = inputs;

  const P = {};


  function getSectionSizeFor(subject, sectionCsvRows) {
    const match = sectionCsvRows.find(r => r["Core_Academic_Section_Size"]?.toLowerCase() === subject.toLowerCase());
    return match ? Number(match.Count) : null;
  }

  function getPercentEnrolledFor(subject, sectionCsvRows) {
    const match = sectionCsvRows.find(r => r["Core_Academic_Section_Size"]?.toLowerCase() === subject.toLowerCase());
    if (match && match["Percent_Enrolled"]) {
      const percent = parseFloat(match["Percent_Enrolled"]);
      return !isNaN(percent) ? percent / 100 : 1.0; // Default to 100% if invalid
    }
    return 1.0; // Default to 100% if not found
  }



  // Row Formulas for High School
  // // P2 List classrooms of different sizes separately
        P.P2 = 0; 
     
   // // P5 Small Group Seminar Rooms
      P.P5 = Math.ceil(totalEnrollment / 500);
  // // P6 Science Labs - 3 x85% ut=20 Seats-1 per /day/student 
        const scienceSectionSize = getSectionSizeFor("Science", inputs.sectionCsvRows) || sectionSize;
        const sciencePercent = getPercentEnrolledFor("Science", inputs.sectionCsvRows);
        P.P6 = Math.ceil((totalEnrollment * sciencePercent / scienceSectionSize / (instructionCycles.B5 / instructionCycles.B4)) * (instructionCycles.B2 / instructionCycles.B3));
  // Prep Room
        P.P7 = Math.ceil(P.P6 / 2); 
  // Central Chemical Storage Rm
        P.P8 = 1; 
  // // P9 List classrooms of different sizes separately
        P.P9 = 0;
  // // P10 Spec Self-Contained Classrooms - uses Special Education Percent_Enrolled
        const spedSectionSize = getSectionSizeFor("Special Education", inputs.sectionCsvRows) || sectionSize;
        const spedPercent = getPercentEnrolledFor("Special Education", inputs.sectionCsvRows);
        P.P10 = Math.ceil(spedTotal * spedPercent / spedSectionSize);  
  // // P11 Self-Contained SPED Toilet     
         P.P11 = P.P10;
  // // P12 Resource Rooms  - 1/2 size Genl. Clrm.
        P.P12 = 2 + Math.ceil(((totalEnrollment + spedTotal) - 600) / 400);
  // // P13 Small Group Room - 1/2 size Genl. Clrm.
        P.P13 = 2 + Math.ceil(((totalEnrollment + spedTotal) - 600) / 400);
  // // P14 Art Rooms

        
        const sectionSizes = extractAcademicSectionSize(inputs.sectionCsvRows);
        const visualArtsSectionSize = sectionSizes.visualArt > 0 ? sectionSizes.visualArt : sectionSize;
        const visualArtsPercent = getPercentEnrolledFor("Visual Art", inputs.sectionCsvRows);

        if (visualArtsSectionSize > 0 && instructionCycles?.B2 > 0 && instructionCycles?.B3 > 0) {
          P.P14 = Math.ceil(
            ((totalEnrollment * visualArtsPercent) / visualArtsSectionSize) *
            (instructionCycles.B2 / instructionCycles.B3)
          );
        } else {
          P.P14 = 0;
        }

  // P15 Art workroom
        P.P15 = P.P14; 
  // // P16 Music Rooms
  
// ✅ P16 - Music Rooms Calculation
      const musicSectionSize = sectionSizes.music > 0 ? sectionSizes.music : sectionSize;
      const musicPercent = getPercentEnrolledFor("Music", inputs.sectionCsvRows);

      P.P16 = Math.ceil(
        ((totalEnrollment * musicPercent) / musicSectionSize) * 
        (instructionCycles.B2 / instructionCycles.B3)
      );

// ✅ P17 - Chorus Rooms Calculation
  P.P17 = P.P16; 

// ✅ P18 - Ensemble Calculations
  P.P18 = 1;


// ✅ P19 - Ensemble Calculations
  P.P19 = Math.max(0, 2 + Math.ceil((totalEnrollment - 600) / 200));
// ✅ P20 - Music Storage 
  P.P20 = 1;
// ✅ P21 - Tech Classroom
const designTechnologyPercent = getPercentEnrolledFor("Design Technology or Sim", inputs.sectionCsvRows);

P.P21 = Math.ceil(((totalEnrollment * designTechnologyPercent) / sectionSizes.designTechnology) * (instructionCycles.B2 / instructionCycles.B3));
// ✅ P22 - Tech Shop - uses Design Technology Percent_Enrolled
  const techShopPercent = getPercentEnrolledFor("Design Technology or Sim", inputs.sectionCsvRows);
  P.P22 = Math.max(1, Math.ceil((totalEnrollment * techShopPercent / 23) * (5 / 30)) - 1);
// ✅ P23 - Gymnasium
  P.P23 = 1;
// ✅ P24 - Physical Education Alternates
  P.P24 = 1;
// ✅ P25 - Gymnasium Storage
  P.P25 = 1;
// ✅ P26 - locker rooms - calculate number of rooms needed
  // Based on typical high school: 1-2 locker rooms (boys/girls)
  // For very large schools, may need additional locker rooms
  const totalStudents = totalEnrollment + spedTotal;
  if (totalStudents <= 1000) {
    P.P26 = 2; // Boys and Girls locker rooms
  } else if (totalStudents <= 2000) {
    P.P26 = 3; // Additional locker room for larger school
  } else {
    P.P26 = 4; // Multiple locker rooms for very large school
  }
// ✅ P27 - Phys Ed Storage
  P.P27 = 1;
// ✅ P28 - Directors Office
  P.P28 = 1;
// ✅ P29 - Health Office
  P.P29 = 1;
// ✅ P30 - Media Center
  P.P30 = 1; // Fixed: Should be 1 room, not calculated based on enrollment
// ✅ P31 - Computer Lab
  P.P31 = 1;
// ✅ P32 - Auditorium - 2/3 Enrollment @ 10 SF/Seat - 750 seats MAX
  P.P32 = 1; // Fixed: Should be 1 room, not calculated based on enrollment
// ✅ P33 - Auditorium Stage
  P.P33 = 1;
// ✅ P34 - Auditorium Storage
  P.P34 = 1; // Fixed: Should be 1 room, not calculated based on enrollment
// ✅ P35 - Make up/Dressing
   P.P35 = 2;
// ✅ P36 - Control Room/Lighting
  P.P36 = 1;
// ✅ P37 - Cafeteria/Student Lounge/Break-out -  3 seatings - 15SF per seat
  P.P37 = 1; // Fixed: Should be 1 room, not calculated based on enrollment
// ✅ P38 - Chair and Table Storage
  P.P38 = 1; // Fixed: Should be 1 room, not calculated based on enrollment
  // ✅ P39 - Scramble service area
    P.P39 = 1;
// ✅ P40 - Kitchen - 1600 SF for first 300 + 1 SF/student Add'l
  P.P40 = 1; // Fixed: Should be 1 room, not calculated based on enrollment
// ✅ P41 - Staff lunch per occupant - 20 SF/Occupant
  P.P41 = 1; // Fixed: Should be 1 room, not calculated based on enrollment
// ✅ P42 - Medical Suite Toilet
  P.P42 = 1;
// ✅ P43 - Nurses office waiting room
  P.P43 = 1;
// ✅ P44 - Interview room
  P.P44 = Math.max(1, 1 + Math.round((totalEnrollment - 600) / 400));
// ✅ P45 - Examination Room
  P.P45 = Math.ceil(totalEnrollment / 250);
// ✅ P46 - General Office/Waiting Room/Toilet
  P.P46 = 1; // Fixed: Should be 1 room, not calculated based on enrollment
  // ✅ P47 - Teachers mail and time room
  P.P47 = 1;
// ✅ P48 - Duplicating Room
  P.P48 = 1;
// ✅ P49 - Records room
  P.P49 = 1;
  // P50 - Principal's Office w conference area
  P.P50 = 1;
// ✅ P51 - Assistant Principal's Waiting Area
  P.P51 = 1;
// ✅ P52 - Assistant Principal's Office
  P.P52 = 1;
// ✅ P53 - Assistant Principal's Office #2
  P.P53 = totalEnrollment < 1000 ? 0 : 1 + Math.floor((totalEnrollment - 1000) / 400);
// ✅ P54 - Supervisroy Office
  P.P54 = 1;
  // ✅ P55 - Conference Room
  P.P55 = 1;
// ✅ P56 - Guidance Office
  P.P56 = Math.ceil(totalEnrollment / 200);
// ✅ P57 - Guidance Office Waiting Room
  P.P57 = 1;
// ✅ P58 - Guidance Store room
  P.P58 = 1;
// ✅ P59 - Career Center
  P.P59 = 1; // Fixed: Should be 1 room, not calculated based on enrollment
// Records Room
  P.P60 = 1; // Fixed: Should be 1 room, not calculated based on enrollment
// ✅ P61 - Teachers work room
  P.P61 = 1; // Fixed: Should be 1 room, not calculated based on enrollment
  // ✅ P62 - Custodian Office
  P.P62 = 1;
  // Custodians Workshop
  P.P63 = 1;
  // ✅ P64 - Custodial Storage
  P.P64 = 1;
  // ✅ P65 - Recycling Trashh
  P.P65 = 1;
  // ✅ P66 - Receiving and General Supply
  P.P66 = 1; // Fixed: Should be 1 room, not calculated based on enrollment
  // ✅ P67 - Store Room
  P.P67 = 1; // Fixed: Should be 1 room, not calculated based on enrollment
  // ✅ P68 - Network Telecom
  P.P68 = 1;
  
  // Dependent Rows

  // // P3 Classroom - General Classrooms - 825 SF min - 950 SF max
    const base = Math.ceil(totalEnrollment / sectionSize / (instructionCycles.B5 / instructionCycles.B4));
    const adjusted = base - (P.P6 ?? 0) - (P.P14 ?? 0) - (P.P21 ?? 0) - (P.P22 ?? 0);
    P.P3 = adjusted < 0 ? 1 : adjusted;
 // Teacher Planning matches General Classrooms
    P.P4 = P.P3; 
    
  
  if (
    visualArtsSectionSize > 0 &&
    instructionCycles?.B2 > 0 &&
    instructionCycles?.B3 > 0
  ) {
    P.P14 = Math.ceil(
      ((totalEnrollment * visualArtsPercent) / visualArtsSectionSize) *
      (instructionCycles.B2 / instructionCycles.B3)
    );
  } else {
    P.P14 = 0; // fallback if any input is missing
  }
  
  // // P3 General Classrooms - uses core academic Percent_Enrolled (calculated after dependencies)
  const coreAcademicPercent = getPercentEnrolledFor("Literature", inputs.sectionCsvRows); // Use Literature as representative
  const baseClassrooms = Math.ceil(totalEnrollment * coreAcademicPercent / sectionSize / (instructionCycles.B5 / instructionCycles.B4));
  const scienceRooms = P.P6 || 0;
  const artRooms = P.P14 || 0;
  const techRooms = (P.P21 || 0) + (P.P22 || 0);
  P.P3 = Math.max(1, baseClassrooms - scienceRooms - artRooms - techRooms);
  
  // // P4 Teacher Planning - based on P3
  P.P4 = P.P3;
  
  return P;
  
}

// Optimized function to calculate allowable square footage based on student number
export function getAllowableSF(students) {
  if (students >= 1 && students <= 639) return 226;
  if (students >= 640 && students <= 659) return 222;
  if (students >= 660 && students <= 679) return 219;
  if (students >= 680 && students <= 699) return 216;
  if (students >= 700 && students <= 719) return 214;
  if (students >= 720 && students <= 739) return 212;
  if (students >= 740 && students <= 759) return 210;
  if (students >= 760 && students <= 779) return 209;
  if (students >= 780 && students <= 799) return 207;
  if (students >= 800 && students <= 819) return 206;
  if (students >= 820 && students <= 839) return 205;
  if (students >= 840 && students <= 859) return 204;
  if (students >= 860 && students <= 879) return 202;
  if (students >= 880 && students <= 899) return 201;
  if (students >= 900 && students <= 939) return 200;
  if (students >= 940 && students <= 959) return 198;
  if (students >= 960 && students <= 979) return 197;
  if (students >= 980 && students <= 999) return 195;
  if (students >= 1000 && students <= 1019) return 194;
  if (students >= 1020 && students <= 1039) return 193;
  if (students >= 1040 && students <= 1059) return 192;
  if (students >= 1060 && students <= 1079) return 190;
  if (students >= 1080 && students <= 1099) return 189;
  if (students >= 1100 && students <= 1119) return 188;
  if (students >= 1120 && students <= 1159) return 186;
  if (students >= 1160 && students <= 1179) return 185;
  if (students >= 1180 && students <= 1199) return 183;
  if (students >= 1200 && students <= 1219) return 182;
  if (students >= 1220 && students <= 1239) return 181;
  if (students >= 1240 && students <= 1259) return 180;
  if (students >= 1260 && students <= 1279) return 178;
  if (students >= 1280 && students <= 1299) return 177;
  if (students >= 1300 && students <= 1319) return 175;
  if (students >= 1320 && students <= 1339) return 174;
  if (students >= 1340 && students <= 1359) return 173;
  if (students >= 1360 && students <= 1379) return 172;
  if (students >= 1380 && students <= 1399) return 171;
  if (students >= 1400 && students <= 1419) return 170;
  if (students >= 1420 && students <= 1439) return 169;
  if (students >= 1440 && students <= 1459) return 167;
  if (students >= 1460 && students <= 1479) return 166;
  if (students >= 1480 && students <= 1499) return 165;
  if (students >= 1500 && students <= 1539) return 164;
  if (students >= 1540 && students <= 1579) return 163;
  if (students >= 1580 && students <= 1619) return 162;
  if (students >= 1620 && students <= 1659) return 161;
  if (students >= 1660 && students <= 1699) return 160;
  if (students >= 1700 && students <= 1739) return 159;
  if (students >= 1740 && students <= 1779) return 158;
  if (students >= 1780 && students <= 1819) return 157;
  if (students >= 1820 && students <= 1859) return 156;
  if (students >= 1860 && students <= 1899) return 155;
  if (students >= 1900) return 154;
  return 226; // Default for unexpected values
}

// Calculate Total GSF based on enrollment
export function calculateGSF(totalEnrollment) {
  const allowableSF = getAllowableSF(totalEnrollment);
  const totalNSF = totalEnrollment * allowableSF;
  const totalGSF = totalNSF * 1.55; // GSF conversion ratio (no rounding)
  return totalGSF;
}


export function extractSectionSize(sectionCsvRows) {
  const filtered = sectionCsvRows.filter(r => r["Core_Academic_Section_Size"] && r["Core_Academic_Section_Size"] !== "Total Enrollment");
  const avg = filtered.reduce((sum, r) => sum + Number(r.Count), 0) / filtered.length;
  return Math.round(avg);
}

export function extractInstructionCycles(cycleCsvRows) {
  const cycles = {};
  for (const row of cycleCsvRows) {
    const name = row.Class_Schedule?.toLowerCase().trim();
    const val = Number(row.Count);

    if (name === "periods teacher teach per day") cycles.B5 = val;
    else if (name === "periods per day") cycles.B4 = val;
    else if (name === "days per cycle") cycles.B2 = val;
    else if (name === "period per cycle") cycles.B3 = val;
    else if (name === "lunch periods") cycles.B6 = val;
  }
  return cycles;
}

export function extractAcademicSectionSize(sectionCsvRows) {
  const sectionSizes = {};
  for (const row of sectionCsvRows) {
    const name = row.Core_Academic_Section_Size?.toLowerCase().trim();
    const val = Number(row.Count);

    if (name === "total enrollment") sectionSizes.totalEnrollment = val;
    else if (name === "literature") sectionSizes.literature = val;
    else if (name === "math") sectionSizes.math = val;
    else if (name === "history") sectionSizes.history = val;
    else if (name === "science") sectionSizes.science = val;
    else if (name === "foreign language") sectionSizes.foreignLanguage = val;
    else if (name === "physical education") sectionSizes.physicalEducation = val;
    else if (name === "visual art") sectionSizes.visualArt = val;
    else if (name === "music") sectionSizes.music = val;
    else if (name === "drama") sectionSizes.drama = val;
    else if (name === "design technology or sim") sectionSizes.designTechnology = val;
  }
  return sectionSizes;
}
export const guidelineFieldMap = {
  P1: "Guideline_#_Rooms",
  P2: "Guideline_#_Rooms",
  P3: "Guideline_#_Rooms",
  P4: "Guideline_#_Rooms",
  P5: "Guideline_#_Rooms",
  P6: "Guideline_#_Rooms",
  P7: "Guideline_#_Rooms",
  P10: "Guideline_#_Rooms",
  P11: "Guideline_#_Rooms",
  P12: "Guideline_#_Rooms",
  P13: "Guideline_#_Rooms",
  P14: "Guideline_#_Rooms",
  P15: "Guideline_#_Rooms",
  P16: "Guideline_#_Rooms",
  P17: "Guideline_#_Rooms",
  P18: "Guideline_#_Rooms",
  P19: "Guideline_#_Rooms",
  P20: "Guideline_#_Rooms",
  P21: "Guideline_#_Rooms",
  P22: "Guideline_#_Rooms",
  P23: "Guideline_#_Rooms",
  P24: "Guideline_#_Rooms",
  P25: "Guideline_#_Rooms",
  P26: "Guideline_#_Rooms",
  P27: "Guideline_#_Rooms",
  P28: "Guideline_#_Rooms",
  P29: "Guideline_#_Rooms",
  P30: "Guideline_#_Rooms",
  P31: "Guideline_#_Rooms",
  P32: "Guideline_#_Rooms",
  P33: "Guideline_#_Rooms",
  P34: "Guideline_#_Rooms",
  P35: "Guideline_#_Rooms",
  P36: "Guideline_#_Rooms",
  P37: "Guideline_#_Rooms",
  P38: "Guideline_#_Rooms",
  P39: "Guideline_#_Rooms",
  P40: "Guideline_#_Rooms",
  P41: "Guideline_#_Rooms",
  P42: "Guideline_#_Rooms",
  P43: "Guideline_#_Rooms",
  P44: "Guideline_#_Rooms",
  P45: "Guideline_#_Rooms",
  P46: "Guideline_#_Rooms",
  P47: "Guideline_#_Rooms",
  P48: "Guideline_#_Rooms",
  P49: "Guideline_#_Rooms",
  P50: "Guideline_#_Rooms",
  P51: "Guideline_#_Rooms",
  P52: "Guideline_#_Rooms",
  P53: "Guideline_#_Rooms",
  P54: "Guideline_#_Rooms",
  P55: "Guideline_#_Rooms",
  P56: "Guideline_#_Rooms",
  P57: "Guideline_#_Rooms",
  P58: "Guideline_#_Rooms",
  P59: "Guideline_#_Rooms",
  P60: "Guideline_#_Rooms",
  P61: "Guideline_#_Rooms",
  P62: "Guideline_#_Rooms",
  P63: "Guideline_#_Rooms",
  P64: "Guideline_#_Rooms",
  P65: "Guideline_#_Rooms",
  P66: "Guideline_#_Rooms",
  P67: "Guideline_#_Rooms",
  P68: "Guideline_#_Rooms"
};

// Make functions and objects globally available
window.computeGuidelineRoomValues = computeGuidelineRoomValues;
window.guidelineFieldMap = guidelineFieldMap;
window.extractSectionSize = extractSectionSize;
window.extractInstructionCycles = extractInstructionCycles;
window.extractAcademicSectionSize = extractAcademicSectionSize;
