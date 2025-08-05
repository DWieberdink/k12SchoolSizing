// main.js
console.log("🚀 main.js file loaded");
console.log("🔍 Checking if recalculateAll function is defined:", typeof window.recalculateAll);

import {
  computeGuidelineRoomValues,
  extractSectionSize,
  extractInstructionCycles,
  guidelineFieldMap,
  calculateGSF,  
  getAllowableSF 
} from './formulas.js';

// Make functions available globally for header metrics
window.calculateGSF = calculateGSF;
window.getAllowableSF = getAllowableSF;

 if (!window.proposedEdits) {
    window.proposedEdits = {};
}
// Function to safely retrieve stored values
window.getStoredValue = function(rowIndex, key, defaultValue) {
    try {
        rowIndex = String(rowIndex);

        if (window.proposedEdits[rowIndex] && window.proposedEdits[rowIndex].hasOwnProperty(key)) {
            const storedValue = window.proposedEdits[rowIndex][key];
            if (storedValue !== null && storedValue !== undefined) {
                const parsedValue = parseFloat(storedValue.toString().replace(/,/g, ""));
                return isNaN(parsedValue) ? defaultValue : parsedValue;
            }
        }
    } catch (error) {
        console.warn(`Error retrieving stored value for row ${rowIndex}, key ${key}:`, error);
    }
    return defaultValue;
};

function extractCellValue(cell, isInput = false) {
    try {
        if (isInput) {
            return parseFloat(cell.querySelector("input")?.value.replace(/,/g, "") || "0");
        }
        return parseFloat(cell.textContent.replace(/,/g, "") || "0");
    } catch (error) {
        console.warn("Error extracting cell value:", error);
        return 0;
    }
}

console.log("RENDERING SCHOOL DETAILS:", window.schoolDetailsData?.length, window.sectionCsvRows, window.instructionCycleRows);

// Update Total GSF and NSF on Enrollment Change
function updateGSF() {
  const enrollmentInput = document.getElementById("inputTotalEnrollment");
  const specialEdInput = document.getElementById("inputSpecialEdEnrollment");
  const gsfDisplay = document.getElementById("displayTotalGSF");
  const nsfDisplay = document.getElementById("displayTotalNSF");

  // Get total enrollment and special education enrollment values
  const totalEnrollment = parseInt(enrollmentInput.value.replace(/,/g, "")) || 0;
  const spedTotal = parseInt(specialEdInput.value.replace(/,/g, "")) || 0;

  console.log("Total Enrollment:", totalEnrollment);
  console.log("Special Ed Enrollment:", spedTotal);

  // Recalculate room values based on new enrollment
  if (window.schoolDetailsData && window.sectionCsvRows && window.instructionCycleRows) {
    const inputs = {
      totalEnrollment: totalEnrollment,
      spedTotal: spedTotal,
      sectionSize: window.sectionCsvRows,
      instructionCycles: window.instructionCycleRows,
      sectionCsvRows: window.sectionCsvRows
    };
    
    // Update the global room results
    if (typeof window.computeGuidelineRoomValues === 'function') {
      window.currentRoomResults = window.computeGuidelineRoomValues(inputs);
    }
  } else {
    console.log("⚠️ Waiting for data to load before calculating room values");
  }

  // Calculate NSF from the school details table (correct method)
  let totalNSF = 0;
  if (typeof window.calculateTotalNSFFromTable === 'function') {
    totalNSF = window.calculateTotalNSFFromTable();
  }
  
  // Calculate GSF using the NSF from table and the multiplier
  const totalGSF = totalNSF * (window.gsfMultiplier || 1.5);

  if (gsfDisplay) {
    gsfDisplay.value = totalGSF.toLocaleString();
  }
  if (nsfDisplay) {
    nsfDisplay.value = totalNSF.toLocaleString();
  }
  
  // Update header metrics if function exists
  if (typeof window.updateHeaderMetrics === 'function') {
    window.updateHeaderMetrics();
  }
  
  // Update dashboard if it exists and we're on the summary tab
  if (typeof window.updateDashboard === 'function') {
    const summaryTab = document.querySelector('#summary-tab');
    if (summaryTab && summaryTab.classList.contains('active')) {
      window.updateDashboard();
    }
  }
  
  // Re-render the table to update the totals
  if (window.schoolDetailsData) {
    renderSchoolDetailsTable();
  }
}

// Note: Event listeners are now set up in the DOMContentLoaded section
// to avoid conflicts and ensure proper initialization order


function updateCellColor(cell, diffValue) {
    if (diffValue < 0) {
        cell.style.backgroundColor = '#f8d7da'; // Red for negative
    } else if (diffValue === 0) {
        cell.style.backgroundColor = '#d4edda'; // Light green for zero
    } else {
        cell.style.backgroundColor = '#eaffea'; // Very light green for positive
    }
    cell.style.fontWeight = 'bold';
}


window.loadStoredEdits = function() {
    try {
        const storedEdits = localStorage.getItem('proposedEdits');
        if (storedEdits) {
            window.proposedEdits = JSON.parse(storedEdits);
            console.log("Loaded proposed edits from localStorage:", window.proposedEdits);
        } else {
            window.proposedEdits = {};
            console.log("No stored edits found. Initialized an empty object.");
        }
    } catch (error) {
        console.error("Error loading proposed edits from localStorage:", error);
        window.proposedEdits = {};
    }
};

// Load stored values as soon as the DOM is ready
window.addEventListener('DOMContentLoaded', loadStoredEdits);


function formatValue(val) {
    const num = parseFloat(val.toString().replace(/,/g, ""));
    if (isNaN(num)) return '';
    return num.toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
        useGrouping: true
    });
}



// Read from Space Guideline Standards 👇
window.syncCSVTableFromDOM = function(containerId, windowKey) {
  console.log(`🔄 syncCSVTableFromDOM called for ${containerId} -> ${windowKey}`);
  const container = document.getElementById(containerId);
  const table = container.querySelector("table");
  if (!table) {
    console.log(`❌ No table found in ${containerId}`);
    return;
  }

  const headers = Array.from(table.querySelectorAll("thead th")).map(th => th.textContent);
  console.log(`📊 Table headers for ${containerId}:`, headers);
  const data = [];

  // List of fields that should be numbers
  const numericFields = [
    "Guideline SF/Room",
    "Guideline # Rooms",
    "Existing SF/Room",
    "Existing # Rooms",
    "Proposed SF/Room",
    "Proposed # Rooms"
  ];

  table.querySelectorAll("tbody tr").forEach(tr => {
    const row = {};
    headers.forEach((header, i) => {
      const td = tr.children[i];
      const input = td.querySelector("input");
      let value = input ? input.value : td.textContent;
      // Clean numeric fields
      if (numericFields.includes(header)) {
        value = value.replace(/,/g, "");
      }
      row[header] = value;
    });
    data.push(row);
  });

  window[windowKey] = data;
  console.log(`✅ Synced ${data.length} rows from ${containerId} to ${windowKey}`);
  
  // Log sample data for debugging
  if (data.length > 0) {
    console.log(`📊 Sample row from ${containerId}:`, data[0]);
  }
  
  // If this is the Space Standard Input table, update School Details SF values
  // DISABLED during recalculateAll to prevent NSF instability
  if (containerId === "standard-input" && !window.isRecalculatingAll) {
    console.log("🔄 Space Standard Input updated - recalculating SF values");
    updateSchoolDetailsSFValues();
  }
}

// Function to update School Details SF values based on Space Standard Input
window.updateSchoolDetailsSFValues = function() {
  console.log("🔄 updateSchoolDetailsSFValues called");
  if (!window.standardInputRows || !window.schoolDetailsData) {
    console.log("⚠️ Missing data for SF calculation:", {
      standardInputRows: !!window.standardInputRows,
      schoolDetailsData: !!window.schoolDetailsData
    });
    return;
  }
  
  console.log("🔍 Updating School Details SF values from Space Standards");
  
  // Create a mapping from room types to SF values
  const sfMapping = {};
  window.standardInputRows.forEach(row => {
    const spaceType = row["Space_Type"];
    const sfPerStudent = parseFloat(row["SF/Student"]) || 0;
    const minSF = parseFloat(row["Min SF"]) || 0;
    const maxSF = parseFloat(row["Max SF"]) || 0;
    
    // Check if SF/Student is actually a number or a description
    let sfValue = 900; // Default SF
    
    if (sfPerStudent > 0 && !isNaN(sfPerStudent)) {
      // SF/Student is a valid number
      sfValue = sfPerStudent;
    } else if (minSF > 0 && !isNaN(minSF)) {
      // Use Min SF if available
      sfValue = minSF;
    } else if (maxSF > 0 && !isNaN(maxSF)) {
      // Use Max SF if available
      sfValue = maxSF;
    } else {
      // Only use defaults if no valid numbers found
      if (spaceType === 'Core Academic Spaces') {
        sfValue = 32; // Standard classroom size
      } else if (spaceType === 'Special Education') {
        sfValue = 950; // Special ed classroom
      } else if (spaceType === 'Specialized Classrooms') {
        sfValue = 50; // Science/lab classrooms
      } else if (spaceType === 'Art & Music') {
        sfValue = 50; // Art/music rooms
      } else if (spaceType === 'Health & Physical Education') {
        sfValue = 70; // PE spaces
      } else if (spaceType === 'Auditorium/Drama') {
        sfValue = 15; // Auditorium per seat
      } else if (spaceType === 'Media Center') {
        sfValue = 50; // Media center
      } else if (spaceType === 'Dining & Foodservice') {
        sfValue = 20; // Dining spaces
      } else if (spaceType === 'Administration & Guidance') {
        sfValue = 120; // Admin spaces
      }
    }
    
    sfMapping[spaceType] = sfValue;
  });
  
  // Update School Details data with new SF values
  let updatedCount = 0;
  window.schoolDetailsData.forEach(row => {
    const roomType = row["ROOM TYPE"];
    const spaceType = row["Core_Academic_Spaces"]; // Use the correct field name
    
    // Try to find matching SF value
    let newSF = 900; // Default SF
    let matched = false;
    
    // Look for exact match first
    if (sfMapping[roomType]) {
      newSF = sfMapping[roomType];
      matched = true;
    } else if (sfMapping[spaceType]) {
      newSF = sfMapping[spaceType];
      matched = true;
    } else {
      // Try partial matches only for specific cases
      for (const [key, value] of Object.entries(sfMapping)) {
        // Only match if the room type clearly belongs to the space type
        if ((roomType.toLowerCase().includes('classroom') && key === 'Core Academic Spaces') ||
            (roomType.toLowerCase().includes('sped') && key === 'Special Education') ||
            (roomType.toLowerCase().includes('science') && key === 'Specialized Classrooms') ||
            (roomType.toLowerCase().includes('art') && key === 'Art & Music') ||
            (roomType.toLowerCase().includes('music') && key === 'Art & Music') ||
            (roomType.toLowerCase().includes('gym') && key === 'Health & Physical Education') ||
            (roomType.toLowerCase().includes('pe') && key === 'Health & Physical Education') ||
            (roomType.toLowerCase().includes('auditorium') && key === 'Auditorium/Drama') ||
            (roomType.toLowerCase().includes('media') && key === 'Media Center') ||
            (roomType.toLowerCase().includes('cafeteria') && key === 'Dining & Foodservice') ||
            (roomType.toLowerCase().includes('office') && key === 'Administration & Guidance')) {
          newSF = value;
          matched = true;
          break;
        }
      }
    }
    
    // Only update if we found a match and the value is significantly different
    const oldSF = parseFloat(row["Guideline_Room_NFA"]) || 0;
    if (matched && Math.abs(oldSF - newSF) > 10) { // Only update if difference is more than 10 SF
      row["Guideline_Room_NFA"] = newSF.toString();
      updatedCount++;
      console.log(`🔄 Updated ${roomType}: ${oldSF} → ${newSF}`);
    }
  });
  
  console.log(`✅ Updated ${updatedCount} SF values in School Details data`);
  
  console.log("✅ Updated School Details SF values");
}

// Store the value and update differences immediately
window.storeAndUpdate = function(rowKey, key, value, rowIndex) {
    // Store the value based on whether it's existing or proposed
    if (key === "Existing_Room_NFA" || key === "Existing_#_Rooms") {
        storeExistingEdit(rowKey, key, value);
    } else {
        storeProposedEdit(rowKey, key, value);
    }

    // Update the differences immediately
    updateDifferences(rowIndex);
};

window.proposedEdits = {};
window.existingEdits = {};
window.existingEditMode = false; // Track if existing fields are editable
window.gsfMultiplier = 1.5; // Default GSF multiplier

// Load existing edits from localStorage
try {
    const storedExistingEdits = localStorage.getItem('existingEdits');
    if (storedExistingEdits) {
        window.existingEdits = JSON.parse(storedExistingEdits);
    }
} catch (e) {
    console.warn('Error loading existing edits:', e);
}

window.storeProposedEdit = function(rowKey, key, value) {
    if (!window.proposedEdits[rowKey]) {
        window.proposedEdits[rowKey] = {};
    }
    // Always remove commas before storing
    const cleanedValue = value.toString().replace(/,/g, "");
    window.proposedEdits[rowKey][key] = cleanedValue;
    localStorage.setItem('proposedEdits', JSON.stringify(window.proposedEdits));
    console.log(`Stored proposed value for row "${rowKey}", key "${key}": ${cleanedValue}`);
};

window.storeExistingEdit = function(rowKey, key, value) {
    if (!window.existingEdits[rowKey]) {
        window.existingEdits[rowKey] = {};
    }
    // Always remove commas before storing
    const cleanedValue = value.toString().replace(/,/g, "");
    window.existingEdits[rowKey][key] = cleanedValue;
    localStorage.setItem('existingEdits', JSON.stringify(window.existingEdits));
    console.log(`Stored existing value for row "${rowKey}", key "${key}": ${cleanedValue}`);
};

// Toggle existing fields edit mode
window.toggleExistingEdit = function() {
    window.existingEditMode = !window.existingEditMode;
    
    // Update the icon appearance
    const editIcon = document.querySelector('.edit-toggle');
    if (editIcon) {
        if (window.existingEditMode) {
            editIcon.classList.remove('text-warning');
            editIcon.classList.add('text-success');
            editIcon.classList.remove('fa-edit');
            editIcon.classList.add('fa-check');
            editIcon.title = 'Click to disable edit mode';
        } else {
            editIcon.classList.remove('text-success');
            editIcon.classList.add('text-warning');
            editIcon.classList.remove('fa-check');
            editIcon.classList.add('fa-edit');
            editIcon.title = 'Click to enable edit mode';
        }
    }
    
    // Re-render the table to show/hide edit inputs
    renderSchoolDetailsTable();
};

// Update GSF multiplier
window.updateGSFMultiplier = function(value) {
    window.gsfMultiplier = parseFloat(value);
    
    // Update the display value
    const multiplierValue = document.getElementById('gsfMultiplierValue');
    if (multiplierValue) {
        multiplierValue.textContent = value;
    }
    
    // Update header metrics to reflect new multiplier
    if (typeof window.updateHeaderMetrics === 'function') {
        window.updateHeaderMetrics();
    }
    
    // Update dashboard if on summary tab
    if (typeof window.updateDashboard === 'function') {
        window.updateDashboard();
    }
    
    // Update admin panel if on admin tab
    if (typeof window.updateAdminPanel === 'function') {
        window.updateAdminPanel();
    }
};

// Update Admin Panel
window.updateAdminPanel = function() {
    // Get current input values
    const totalEnrollment = parseInt(document.getElementById("inputTotalEnrollment")?.value.replace(/,/g, "") || "0");
    const specialEdEnrollment = parseInt(document.getElementById("inputSpecialEdEnrollment")?.value || "0");
    const totalStudents = totalEnrollment + specialEdEnrollment;
    const gsfMultiplier = window.gsfMultiplier || 1.5;
    
    // Update input summary
    document.getElementById("adminTotalEnrollment").textContent = totalEnrollment.toLocaleString();
    document.getElementById("adminSpecialEdEnrollment").textContent = specialEdEnrollment.toLocaleString();
    document.getElementById("adminTotalStudents").textContent = totalStudents.toLocaleString();
    document.getElementById("adminGSFMultiplier").textContent = gsfMultiplier.toString();
    
    // Calculate and update core calculations
    const totalNSF = typeof window.calculateTotalNSFFromTable === 'function' ? window.calculateTotalNSFFromTable() : 0;
    const totalGSF = totalNSF * gsfMultiplier;
    
    document.getElementById("adminTotalNSF").textContent = totalNSF.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 1});
    document.getElementById("adminAdjustedGSF").textContent = totalGSF.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 1});
    
    // Update section sizes
    updateAdminSectionSizes();
    
    // Update instruction cycles
    updateAdminInstructionCycles();
    
    // Update room guidelines
    updateAdminRoomGuidelines();
    
    // Update data sources
    updateAdminDataSources();
};

// Update Section Sizes in Admin Panel
function updateAdminSectionSizes() {
    const tbody = document.getElementById('adminSectionSizes');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (window.sectionCsvRows) {
        const sectionSizes = extractAcademicSectionSize(window.sectionCsvRows);
        
        Object.entries(sectionSizes).forEach(([subject, size]) => {
            if (subject !== 'totalEnrollment') {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td><strong>${subject.charAt(0).toUpperCase() + subject.slice(1)}</strong></td>
                    <td>${size}</td>
                    <td><code>Average from CSV data</code></td>
                    <td>${size} students per section</td>
                `;
                tbody.appendChild(row);
            }
        });
    }
}

// Update Instruction Cycles in Admin Panel
function updateAdminInstructionCycles() {
    const tbody = document.getElementById('adminInstructionCycles');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (window.instructionCycleRows) {
        const cycles = extractInstructionCycles(window.instructionCycleRows);
        
        const cycleLabels = {
            'B2': 'Days per Cycle',
            'B3': 'Periods per Cycle', 
            'B4': 'Periods per Day',
            'B5': 'Periods Teacher Teaches per Day',
            'B6': 'Lunch Periods'
        };
        
        Object.entries(cycles).forEach(([key, value]) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><strong>${cycleLabels[key] || key}</strong></td>
                <td>${value}</td>
                <td>${key} parameter from instruction cycles data</td>
            `;
            tbody.appendChild(row);
        });
    }
}

// Update Room Guidelines in Admin Panel
function updateAdminRoomGuidelines() {
    const tbody = document.getElementById('adminRoomGuidelines');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (window.schoolDetailsData) {
        const totalEnrollment = parseInt(document.getElementById("inputTotalEnrollment")?.value.replace(/,/g, "") || "0");
        const specialEdEnrollment = parseInt(document.getElementById("inputSpecialEdEnrollment")?.value || "0");
        const totalStudents = totalEnrollment + specialEdEnrollment;
        
        const inputs = {
            totalEnrollment: totalEnrollment,
            spedTotal: specialEdEnrollment,
            sectionSize: extractSectionSize(window.sectionCsvRows || []),
            instructionCycles: extractInstructionCycles(window.instructionCycleRows || []),
            sectionCsvRows: window.sectionCsvRows || []
        };
        
        const roomResults = computeGuidelineRoomValues(inputs);
        
        // Create a mapping of P-codes to their actual descriptions
        const pCodeDescriptions = {
            'P3': 'Classroom - General',
            'P4': 'Teacher Planning',
            'P5': 'Small Group Seminar (20-30 seats)',
            'P6': 'Science Classroom / Lab',
            'P7': 'Prep Room',
            'P8': 'Central Chemical Storage Rm',
            'P10': 'Self-Contained SPED',
            'P11': 'Self-Contained SPED Toilet',
            'P12': 'Resource Room',
            'P13': 'Small Group Room',
            'P14': 'Art Classroom - 25 seats',
            'P15': 'Art Workroom w/ Storage & kiln',
            'P16': 'Band - 50 - 100 seats',
            'P17': 'Chorus - 50 - 100 seats',
            'P18': 'Ensemble',
            'P19': 'Music Practice',
            'P20': 'Music Storage',
            'P21': 'Tech Clrm. - (E.G. Drafting, Business)',
            'P22': 'Tech Shop - (E.G. Consumer, Wood)',
            'P23': 'Gymnasium',
            'P24': 'PE Alternatives',
            'P25': 'Gym Storeroom',
            'P26': 'Locker Rooms - Boys / Girls w/ Toilets',
            'P27': 'Phys. Ed. Storage',
            'P28': 'Athletic Director\'s Office',
            'P29': 'Health Instructor\'s Office w/ Shower & Toilet',
            'P30': 'Media Center / Reading Room',
            'P31': 'Computer Lab',
            'P32': 'Auditorium',
            'P33': 'Stage',
            'P34': 'Auditorium Storage',
            'P35': 'Make-up / Dressing Rooms',
            'P36': 'Controls / Lighting / Projection',
            'P37': 'Cafeteria / Student Lounge / Break-out',
            'P38': 'Chair / Table Storage',
            'P39': 'Scramble Serving Area',
            'P40': 'Kitchen',
            'P41': 'Staff Lunch Room',
            'P42': 'Medical Suite Toilet',
            'P43': 'Nurses\' Office / Waiting Room',
            'P44': 'Interview Room',
            'P45': 'Examination Room / Resting',
            'P46': 'General Office / Waiting Room / Toilet',
            'P47': 'Teachers\' Mail and Time Room',
            'P48': 'Duplicating Room',
            'P49': 'Records Room',
            'P50': 'Principal\'s Office w/ Conference Area',
            'P51': 'Principal\'s Secretary / Waiting',
            'P52': 'Assistant Principal\'s Office - AP1',
            'P53': 'Assistant Principal\'s Office - AP2',
            'P54': 'Supervisory / Spare Office',
            'P55': 'Conference Room',
            'P56': 'Guidance Office',
            'P57': 'Guidance Waiting Room',
            'P58': 'Guidance Storeroom',
            'P59': 'Career Center',
            'P60': 'Records Room',
            'P61': 'Teachers\' Work Room',
            'P62': 'Custodian\'s Office',
            'P63': 'Custodian\'s Workshop',
            'P64': 'Custodian\'s Storage',
            'P65': 'Recycling Room / Trash',
            'P66': 'Receiving and General Supply',
            'P67': 'Storeroom',
            'P68': 'Network / Telecom Room'
        };
        
        window.schoolDetailsData.forEach(row => {
            const roomType = row["ROOM TYPE"];
            const guidelineKey = row["Guideline Key"];
            const result = roomResults[guidelineKey];
            
            if (result !== undefined) {
                const actualDescription = pCodeDescriptions[guidelineKey] || roomType;
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td><strong>${actualDescription}</strong></td>
                    <td><code>${guidelineKey}</code></td>
                    <td><code>Guideline calculation based on enrollment and cycles</code></td>
                    <td>Using ${totalStudents} students</td>
                    <td>${result.toFixed(2)} rooms</td>
                `;
                tbody.appendChild(row);
            }
        });
    }
}

// Update Data Sources in Admin Panel
function updateAdminDataSources() {
    if (window.sectionCsvRows) {
        document.getElementById("adminSectionSizeRecords").textContent = window.sectionCsvRows.length;
    }
    
    if (window.instructionCycleRows) {
        document.getElementById("adminInstructionCycleRecords").textContent = window.instructionCycleRows.length;
    }
    
    if (window.schoolDetailsData) {
        document.getElementById("adminSpaceStandardRecords").textContent = window.schoolDetailsData.length;
    }
}





function renderSchoolDetailsTable(containerId) {
  console.log("🔍 RENDERING SCHOOL DETAILS:", containerId);
  const data = window.schoolDetailsData || [];
  const container = document.getElementById("schoolDetailsTableContainer");
  const selectedGroup = document.getElementById("spaceGroupFilter")?.value;
  
  console.log("🔍 Data available:", {
    dataLength: data.length,
    container: !!container,
    guidelineFieldMap: !!window.guidelineFieldMap,
    computeGuidelineRoomValues: !!window.computeGuidelineRoomValues
  });

  // Apply filtering based on selected group
  let filteredData = data;
  if (selectedGroup && selectedGroup !== "") {
    filteredData = data.filter(row => row["Core_Academic_Spaces"] === selectedGroup);
    console.log(`🔍 Filtering by group: "${selectedGroup}" - showing ${filteredData.length} of ${data.length} rows`);
  } else {
    console.log("🔍 No filter applied - showing all rows");
  }

  const sectionSize = extractSectionSize(window.sectionCsvRows || []);
  const instructionCycles = extractInstructionCycles(window.instructionCycleRows || []);

  container.innerHTML = "";

  // Create table wrapper for proper sticky header support
  const tableWrapper = document.createElement("div");
  tableWrapper.className = "table-wrapper";
  container.appendChild(tableWrapper);

  // Function to adjust sticky header positioning
  const adjustStickyHeaders = () => {
    const table = tableWrapper.querySelector('.data-table');
    if (table) {
      const firstHeaderRow = table.querySelector('thead tr:first-child');
      const secondHeaderRow = table.querySelector('thead tr:nth-child(2)');
      
      if (firstHeaderRow && secondHeaderRow) {
        // Get the computed height of the first row
        const firstRowHeight = firstHeaderRow.offsetHeight;
        // Set the second row to start right after the first row
        secondHeaderRow.style.top = `${firstRowHeight}px`;
        
        // Ensure the first row stays at the very top
        firstHeaderRow.style.top = '0px';
        
        console.log('Sticky headers adjusted:', {
          firstRowHeight: firstRowHeight,
          secondRowTop: secondHeaderRow.style.top
        });
      }
    }
  };

  const columnMap = {
    "Space Group": "Core_Academic_Spaces",
    "Space Type": "ROOM TYPE",
    "Guideline SF/Room": "Guideline_Room_NFA",
    "Guideline # Rooms": "Guideline_#_Rooms",
    "Guideline Total SF": "__Guideline_calculated_total__",
    "Existing SF/Room": "Existing_Room_NFA",
    "Existing # Rooms": "Existing_#_Rooms",
    "Proposed SF/Room": "Proposed_Keep_Room_NFA",
    "Proposed # Rooms": "Proposed_Keep_#_Rooms",
    "Difference SF/Room": "Difference_Proposed_ROOMNFA",
    "Difference # Rooms": "Difference_Proposed_#_OF_RMS",
    "Impact Total SF": "__Impact_calculated_total__"
  };

  const inputs = {
    totalEnrollment: parseInt(document.getElementById("inputTotalEnrollment").value.replace(/,/g, "") || "0"),
    spedTotal: parseInt(document.getElementById("inputSpecialEdEnrollment").value || "0"),
    sectionSize,
    instructionCycles,
    sectionCsvRows: window.sectionCsvRows || []
  };

  // Use updated room results if available, otherwise compute new ones
  let roomResults = window.currentRoomResults;
  if (!roomResults && window.sectionCsvRows && window.instructionCycleRows) {
    roomResults = window.computeGuidelineRoomValues(inputs);
    // Cache the results for future use
    window.currentRoomResults = roomResults;
  } else if (!roomResults) {
    console.log("⚠️ Table calculation waiting for data:", {
      sectionCsvRows: !!window.sectionCsvRows,
      instructionCycleRows: !!window.instructionCycleRows
    });
    roomResults = {};
  }
  
  console.log("🔍 Room results for table:", roomResults);

  const editableCSVKeys = ["Existing_Room_NFA", "Existing_#_Rooms", "Proposed_Keep_Room_NFA", "Proposed_Keep_#_Rooms"];

  const table = document.createElement("table");
  table.className = "data-table";

  const thead = document.createElement("thead");
  const groupHeaderRow = document.createElement("tr");
  groupHeaderRow.className = "column-group-header";
  groupHeaderRow.innerHTML = `
    <th colspan="2" class="text-center column-group school-details-group">
      <i class="fas fa-building me-2"></i>School Details
    </th>
    <th colspan="3" class="text-center column-group guidelines-group">
      <i class="fas fa-ruler-combined me-2"></i>Guidelines
    </th>
    <th colspan="2" class="text-center column-group existing-group">
      <i class="fas fa-history me-2"></i>Existing 
      <i class="fas fa-edit text-warning ms-1 edit-toggle" onclick="toggleExistingEdit()" title="Click to toggle edit mode" style="cursor: pointer;"></i>
    </th>
    <th colspan="2" class="text-center column-group proposed-group">
      <i class="fas fa-edit me-2"></i>Proposed
    </th>
    <th colspan="3" class="text-center column-group difference-group">
      <i class="fas fa-balance-scale me-2"></i>Difference | Guideline vs Proposed
    </th>`;
  thead.appendChild(groupHeaderRow);

  // Column header row
  const headerRow = document.createElement("tr");
  headerRow.className = "column-subheader";
  Object.keys(columnMap).forEach((header, index) => {
    const th = document.createElement("th");
    th.textContent = header;
    th.className = "text-center column-subheader-cell";
    
    // Add group-specific styling based on column position
    if (index < 2) {
      th.classList.add("school-details-subheader");
    } else if (index < 5) {
      th.classList.add("guidelines-subheader");
    } else if (index < 7) {
      th.classList.add("existing-subheader");
    } else if (index < 9) {
      th.classList.add("proposed-subheader");
    } else {
      th.classList.add("difference-subheader");
    }
    
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");

  filteredData.forEach((row, rowIndex) => {
    const tr = document.createElement("tr");

    const Pkey = row["Guideline Key"];
    
    // Get current enrollment values for P26 calculation
    const totalEnrollment = parseInt(document.getElementById("inputTotalEnrollment")?.value.replace(/,/g, "") || "0");
    const specialEdEnrollment = parseInt(document.getElementById("inputSpecialEdEnrollment")?.value || "0");
    const column = window.guidelineFieldMap?.[Pkey] || "Guideline_#_Rooms";
    
    if (rowIndex === 0) {
      console.log("🔍 First row debug:", {
        Pkey,
        column,
        guidelineFieldMap: !!window.guidelineFieldMap,
        roomType: row["ROOM TYPE"]
      });
    }

    if (Pkey && typeof roomResults?.[Pkey] === "number" && !isNaN(roomResults[Pkey])) {
      row[column] = roomResults[Pkey];
    }

    const guidelineRooms = parseFloat(row["Guideline_#_Rooms"]) || 0;
    const guidelineSF = parseFloat(row["Guideline_Room_NFA"]) || 0;
    
    // Special handling for P26 - Locker Rooms (dynamic SF based on enrollment)
    if (Pkey === "P26") {
      const totalStudents = totalEnrollment + specialEdEnrollment;
      const dynamicSF = totalStudents * 5.6; // 5.6 SF per student
      row["Guideline_Room_NFA"] = dynamicSF; // Update the SF per room value
    }
    
    // Special handling for P30 - Media Center (dynamic SF based on enrollment)
    if (Pkey === "P30") {
      // Formula: IF(enrollment < 600, 3650, 3650 + (enrollment - 600) * 6.25)
      const dynamicSF = totalEnrollment < 600 ? 3650 : 3650 + (totalEnrollment - 600) * 6.25;
      row["Guideline_Room_NFA"] = dynamicSF; // Update the SF per room value
    }
    
    // Special handling for P37 - Cafeteria (dynamic SF based on enrollment)
    if (Pkey === "P37") {
      // Formula: (Total Enrollment + Special Ed Enrollment) / Number of Lunch Periods * 15 SF per seat
      const totalStudents = totalEnrollment + specialEdEnrollment;
      const lunchPeriods = 2; // From Instruction_Cycles.csv
      const dynamicSF = (totalStudents / lunchPeriods) * 15; // 15 SF per seat
      row["Guideline_Room_NFA"] = dynamicSF; // Update the SF per room value
    }
    
    // Special handling for P38 - Chair and Table Storage (dynamic SF based on enrollment)
    if (Pkey === "P38") {
      // Formula: IF((enrollment + Special Ed enrollment)<600,300,300+ROUND(((enrollment + special Ed enrollment)-600)/400*100,0))
      const totalStudents = totalEnrollment + specialEdEnrollment;
      const dynamicSF = totalStudents < 600 ? 300 : 300 + Math.round((totalStudents - 600) / 400 * 100);
      row["Guideline_Room_NFA"] = dynamicSF; // Update the SF per room value
    }
    
    // Special handling for P40 - Kitchen (dynamic SF based on enrollment)
    if (Pkey === "P40") {
      // Formula: IF((enrollment + special enrollment)<300,1600,1600+((enrollment + special enrollment)-300))
      const totalStudents = totalEnrollment + specialEdEnrollment;
      const dynamicSF = totalStudents < 300 ? 1600 : 1600 + (totalStudents - 300);
      row["Guideline_Room_NFA"] = dynamicSF; // Update the SF per room value
    }
    
    // Special handling for P41 - Staff Lunch Room (dynamic SF based on enrollment)
    if (Pkey === "P41") {
      // Formula: IF((enrollment + special ed enrollment)<600,400,400+((enrollment + special ed enrollment)-600)*0.25)
      const totalStudents = totalEnrollment + specialEdEnrollment;
      const dynamicSF = totalStudents < 600 ? 400 : 400 + (totalStudents - 600) * 0.25;
      row["Guideline_Room_NFA"] = dynamicSF; // Update the SF per room value
    }
    
    // Special handling for P46 - General Office/Waiting Room/Toilet (dynamic SF based on enrollment)
    if (Pkey === "P46") {
      // Formula: IF(Enrolment + Special Ed enrollment<600,300,300+(Enrolment + Special Ed enrollment-600)*0.5)
      const totalStudents = totalEnrollment + specialEdEnrollment;
      const dynamicSF = totalStudents < 600 ? 300 : 300 + (totalStudents - 600) * 0.5;
      row["Guideline_Room_NFA"] = dynamicSF; // Update the SF per room value
    }
    
    // Special handling for P59 - Career Center (dynamic SF based on enrollment)
    if (Pkey === "P59") {
      // Formula: IF(Enrolment + Special Ed enrollment<600,300,300+(Enrolment + Special Ed enrollment-600)*0.25)
      const totalStudents = totalEnrollment + specialEdEnrollment;
      const dynamicSF = totalStudents < 600 ? 300 : 300 + (totalStudents - 600) * 0.25;
      row["Guideline_Room_NFA"] = dynamicSF; // Update the SF per room value
    }
    
    // Special handling for P60 - Records Room (dynamic SF based on enrollment)
    if (Pkey === "P60") {
      // Formula: IF(Enrolment + Special Ed enrollment<600,100,100+(Enrolment + Special Ed enrollment-600)*0.125)
      const totalStudents = totalEnrollment + specialEdEnrollment;
      const dynamicSF = totalStudents < 600 ? 100 : 100 + (totalStudents - 600) * 0.125;
      row["Guideline_Room_NFA"] = dynamicSF; // Update the SF per room value
    }
    
    // Special handling for P61 - Teachers Work Room (dynamic SF based on enrollment)
    if (Pkey === "P61") {
      // Formula: IF(Enrolment + Special Ed enrollment<600,300,300+(Enrolment + Special Ed enrollment-600)*0.5)
      const totalStudents = totalEnrollment + specialEdEnrollment;
      const dynamicSF = totalStudents < 600 ? 300 : 300 + (totalStudents - 600) * 0.5;
      row["Guideline_Room_NFA"] = dynamicSF; // Update the SF per room value
    }
    
    // Special handling for P66 - Receiving and General Supply (dynamic SF based on enrollment)
    if (Pkey === "P66") {
      // Formula: IF(Enrolment + Special Ed enrollment<600,300,300+(Enrolment + Special Ed enrollment-600)*0.25)
      const totalStudents = totalEnrollment + specialEdEnrollment;
      const dynamicSF = totalStudents < 600 ? 300 : 300 + (totalStudents - 600) * 0.25;
      row["Guideline_Room_NFA"] = dynamicSF; // Update the SF per room value
    }
    
    // Special handling for P67 - Store Room (dynamic SF based on enrollment)
    if (Pkey === "P67") {
      // Formula: IF(Enrolment + Special Ed enrollment<600,400,400+(Enrolment + Special Ed enrollment-600)*0.5)
      const totalStudents = totalEnrollment + specialEdEnrollment;
      const dynamicSF = totalStudents < 600 ? 400 : 400 + (totalStudents - 600) * 0.5;
      row["Guideline_Room_NFA"] = dynamicSF; // Update the SF per room value
    }
    
    // Special handling for P26 - Locker Rooms (dynamic SF based on enrollment)
    let totalGuidelineArea;
    if (Pkey === "P26") {
      const totalStudents = totalEnrollment + specialEdEnrollment;
      const dynamicSF = totalStudents * 5.6; // 5.6 SF per student
      totalGuidelineArea = guidelineRooms * dynamicSF;
    } else if (Pkey === "P30") {
      // Special handling for P30 - Media Center (dynamic SF based on enrollment)
      // Formula: IF(enrollment < 600, 3650, 3650 + (enrollment - 600) * 6.25)
      const dynamicSF = totalEnrollment < 600 ? 3650 : 3650 + (totalEnrollment - 600) * 6.25;
      totalGuidelineArea = guidelineRooms * dynamicSF;
    } else if (Pkey === "P37") {
      // Special handling for P37 - Cafeteria (dynamic SF based on enrollment)
      // Formula: (Total Enrollment + Special Ed Enrollment) / Number of Lunch Periods * 15 SF per seat
      const totalStudents = totalEnrollment + specialEdEnrollment;
      const lunchPeriods = 2; // From Instruction_Cycles.csv
      const dynamicSF = (totalStudents / lunchPeriods) * 15; // 15 SF per seat
      totalGuidelineArea = guidelineRooms * dynamicSF;
    } else if (Pkey === "P38") {
      // Special handling for P38 - Chair and Table Storage (dynamic SF based on enrollment)
      // Formula: IF((enrollment + Special Ed enrollment)<600,300,300+ROUND(((enrollment + special Ed enrollment)-600)/400*100,0))
      const totalStudents = totalEnrollment + specialEdEnrollment;
      const dynamicSF = totalStudents < 600 ? 300 : 300 + Math.round((totalStudents - 600) / 400 * 100);
      totalGuidelineArea = guidelineRooms * dynamicSF;
    } else if (Pkey === "P40") {
      // Special handling for P40 - Kitchen (dynamic SF based on enrollment)
      // Formula: IF((enrollment + special enrollment)<300,1600,1600+((enrollment + special enrollment)-300))
      const totalStudents = totalEnrollment + specialEdEnrollment;
      const dynamicSF = totalStudents < 300 ? 1600 : 1600 + (totalStudents - 300);
      totalGuidelineArea = guidelineRooms * dynamicSF;
    } else if (Pkey === "P41") {
      // Special handling for P41 - Staff Lunch Room (dynamic SF based on enrollment)
      // Formula: IF((enrollment + special ed enrollment)<600,400,400+((enrollment + special ed enrollment)-600)*0.25)
      const totalStudents = totalEnrollment + specialEdEnrollment;
      const dynamicSF = totalStudents < 600 ? 400 : 400 + (totalStudents - 600) * 0.25;
      totalGuidelineArea = guidelineRooms * dynamicSF;
    } else if (Pkey === "P46") {
      // Special handling for P46 - General Office/Waiting Room/Toilet (dynamic SF based on enrollment)
      // Formula: IF(Enrolment + Special Ed enrollment<600,300,300+(Enrolment + Special Ed enrollment-600)*0.5)
      const totalStudents = totalEnrollment + specialEdEnrollment;
      const dynamicSF = totalStudents < 600 ? 300 : 300 + (totalStudents - 600) * 0.5;
      totalGuidelineArea = guidelineRooms * dynamicSF;
    } else if (Pkey === "P59") {
      // Special handling for P59 - Career Center (dynamic SF based on enrollment)
      // Formula: IF(Enrolment + Special Ed enrollment<600,300,300+(Enrolment + Special Ed enrollment-600)*0.25)
      const totalStudents = totalEnrollment + specialEdEnrollment;
      const dynamicSF = totalStudents < 600 ? 300 : 300 + (totalStudents - 600) * 0.25;
      totalGuidelineArea = guidelineRooms * dynamicSF;
    } else if (Pkey === "P60") {
      // Special handling for P60 - Records Room (dynamic SF based on enrollment)
      // Formula: IF(Enrolment + Special Ed enrollment<600,100,100+(Enrolment + Special Ed enrollment-600)*0.125)
      const totalStudents = totalEnrollment + specialEdEnrollment;
      const dynamicSF = totalStudents < 600 ? 100 : 100 + (totalStudents - 600) * 0.125;
      totalGuidelineArea = guidelineRooms * dynamicSF;
    } else if (Pkey === "P61") {
      // Special handling for P61 - Teachers Work Room (dynamic SF based on enrollment)
      // Formula: IF(Enrolment + Special Ed enrollment<600,300,300+(Enrolment + Special Ed enrollment-600)*0.5)
      const totalStudents = totalEnrollment + specialEdEnrollment;
      const dynamicSF = totalStudents < 600 ? 300 : 300 + (totalStudents - 600) * 0.5;
      totalGuidelineArea = guidelineRooms * dynamicSF;
    } else if (Pkey === "P66") {
      // Special handling for P66 - Receiving and General Supply (dynamic SF based on enrollment)
      // Formula: IF(Enrolment + Special Ed enrollment<600,300,300+(Enrolment + Special Ed enrollment-600)*0.25)
      const totalStudents = totalEnrollment + specialEdEnrollment;
      const dynamicSF = totalStudents < 600 ? 300 : 300 + (totalStudents - 600) * 0.25;
      totalGuidelineArea = guidelineRooms * dynamicSF;
    } else if (Pkey === "P67") {
      // Special handling for P67 - Store Room (dynamic SF based on enrollment)
      // Formula: IF(Enrolment + Special Ed enrollment<600,400,400+(Enrolment + Special Ed enrollment-600)*0.5)
      const totalStudents = totalEnrollment + specialEdEnrollment;
      const dynamicSF = totalStudents < 600 ? 400 : 400 + (totalStudents - 600) * 0.5;
      totalGuidelineArea = guidelineRooms * dynamicSF;
    } else {
      totalGuidelineArea = guidelineRooms * guidelineSF;
    }
    row["__Guideline_calculated_total__"] = totalGuidelineArea;

    // Safely retrieve the proposed values using the improved function

const rowKey = row["ROOM TYPE"];
let proposedRooms = row["Proposed_Keep_#_Rooms"];
let proposedSF = row["Proposed_Keep_Room_NFA"];

// Prefer the value from memory if it exists
if (window.proposedEdits[rowKey] && window.proposedEdits[rowKey]["Proposed_Keep_#_Rooms"] !== undefined) {
    proposedRooms = window.proposedEdits[rowKey]["Proposed_Keep_#_Rooms"];
}
if (window.proposedEdits[rowKey] && window.proposedEdits[rowKey]["Proposed_Keep_Room_NFA"] !== undefined) {
    proposedSF = window.proposedEdits[rowKey]["Proposed_Keep_Room_NFA"];
}

// Always parse as number, stripping commas
proposedRooms = parseNumber(proposedRooms);
proposedSF = parseNumber(proposedSF);


// Calculate the differences

const differenceRooms = proposedRooms - guidelineRooms;
const differenceSF = proposedSF - guidelineSF;


// Update the row with calculated differences
row["Difference_Proposed_ROOMNFA"] = isNaN(differenceSF) ? "" : formatValue(differenceSF);
row["Difference_Proposed_#_OF_RMS"] = isNaN(differenceRooms) ? "" : formatValue(differenceRooms);

// Calculate impact total SF: -(difference SF/room × difference # rooms)
const impactTotalSF = -(differenceSF * differenceRooms);
row["__Impact_calculated_total__"] = isNaN(impactTotalSF) ? "" : formatValue(impactTotalSF);


  
  

Object.entries(columnMap).forEach(([label, key], colIndex) => {
    const td = document.createElement("td");
    if (editableCSVKeys.includes(key)) {
        // Handle both existing and proposed values
        let defaultValue = "0";
        
        if (key === "Existing_Room_NFA" || key === "Existing_#_Rooms") {
            // For existing values, prefer stored edits, then original data
            if (window.existingEdits[rowKey]?.[key] !== undefined) {
                defaultValue = window.existingEdits[rowKey][key];
            } else if (row[key] && row[key] !== "") {
                defaultValue = row[key];
            }
        } else {
            // For proposed values, prefer stored edits, then original data, then 0
            if (window.proposedEdits[rowKey]?.[key] !== undefined) {
                defaultValue = window.proposedEdits[rowKey][key];
            } else if (row[key] && row[key] !== "") {
                defaultValue = row[key];
            }
        }
        
        // Show input field for existing values only when edit mode is enabled
        if ((key === "Existing_Room_NFA" || key === "Existing_#_Rooms") && !window.existingEditMode) {
            // Show as read-only text when not in edit mode
            td.textContent = isNaN(parseFloat(defaultValue)) ? defaultValue : formatValue(defaultValue);
        } else {
            // Show as input field
            td.innerHTML = `<input type="text" class="form-control form-control-sm fw-bold text-primary" value="${defaultValue}" data-row="${rowIndex}" data-col="${key}" 
    onchange="storeAndUpdate('${row['ROOM TYPE']}', '${key}', this.value, '${rowIndex}');" />`;
        }

    } else {
        const value = row[key];
        td.textContent = isNaN(parseFloat(value)) ? value : formatValue(value);
    }

    // Apply color logic to difference columns during rendering
    if (key === "Difference_Proposed_ROOMNFA" || key === "Difference_Proposed_#_OF_RMS" || key === "__Impact_calculated_total__") {
        const diffValue = parseFloat(td.textContent.replace(/,/g, "")) || 0;
        updateCellColor(td, diffValue);
    }

  td.style.whiteSpace = 'nowrap';
  td.style.padding = '0.5rem';
  tr.appendChild(td);
});

  tbody.appendChild(tr);
});

// Add total row
const totalRow = document.createElement("tr");
totalRow.className = "total-row";
totalRow.style.backgroundColor = "#f8f9fa";
totalRow.style.fontWeight = "bold";
totalRow.style.borderTop = "2px solid #dee2e6";

  // Calculate totals for visible rows only
  let totalGuidelineRooms = 0;
  let totalGuidelineTotalSF = 0;
  let totalExistingRooms = 0;
  let totalProposedRooms = 0;
  let totalDifferenceRooms = 0;
  let totalImpactSF = 0;
  
  // Get current enrollment values for P26 calculation
  const totalEnrollment = parseInt(document.getElementById("inputTotalEnrollment")?.value.replace(/,/g, "") || "0");
  const specialEdEnrollment = parseInt(document.getElementById("inputSpecialEdEnrollment")?.value || "0");
  


filteredData.forEach((row) => {
  const Pkey = row["Guideline Key"];
  const column = guidelineFieldMap[Pkey] || "Guideline_#_Rooms";

  if (Pkey && typeof roomResults?.[Pkey] === "number" && !isNaN(roomResults[Pkey])) {
    row[column] = roomResults[Pkey];
  }

  const guidelineRooms = parseFloat(row["Guideline_#_Rooms"]) || 0;
  const guidelineSF = parseFloat(row["Guideline_Room_NFA"]) || 0;
  
  // Special handling for P26 - Locker Rooms (dynamic SF based on enrollment)
  let totalGuidelineArea;
  if (Pkey === "P26") {
    const totalStudents = totalEnrollment + specialEdEnrollment;
    const dynamicSF = totalStudents * 5.6; // 5.6 SF per student
    totalGuidelineArea = guidelineRooms * dynamicSF;
  } else {
    totalGuidelineArea = guidelineRooms * guidelineSF;
  }

  // Get existing values
  const rowKey = row["ROOM TYPE"];
  let existingRooms = parseFloat(row["Existing_#_Rooms"]) || 0;
  let existingSF = parseFloat(row["Existing_Room_NFA"]) || 0;
  
  if (window.existingEdits[rowKey]?.["Existing_#_Rooms"] !== undefined) {
    existingRooms = parseFloat(window.existingEdits[rowKey]["Existing_#_Rooms"]) || 0;
  }
  if (window.existingEdits[rowKey]?.["Existing_Room_NFA"] !== undefined) {
    existingSF = parseFloat(window.existingEdits[rowKey]["Existing_Room_NFA"]) || 0;
  }

  // Get proposed values
  let proposedRooms = parseFloat(row["Proposed_Keep_#_Rooms"]) || 0;
  let proposedSF = parseFloat(row["Proposed_Keep_Room_NFA"]) || 0;
  
  if (window.proposedEdits[rowKey]?.["Proposed_Keep_#_Rooms"] !== undefined) {
    proposedRooms = parseFloat(window.proposedEdits[rowKey]["Proposed_Keep_#_Rooms"]) || 0;
  }
  if (window.proposedEdits[rowKey]?.["Proposed_Keep_Room_NFA"] !== undefined) {
    proposedSF = parseFloat(window.proposedEdits[rowKey]["Proposed_Keep_Room_NFA"]) || 0;
  }

  // Calculate differences
  const differenceRooms = proposedRooms - guidelineRooms;
  const differenceSF = proposedSF - guidelineSF;

  // Add to totals
  totalGuidelineRooms += guidelineRooms;
  totalGuidelineTotalSF += totalGuidelineArea;
  totalExistingRooms += existingRooms;
  totalProposedRooms += proposedRooms;
  totalDifferenceRooms += differenceRooms;
  
  // Calculate and add impact total
  const impactSF = -(differenceSF * differenceRooms);
  totalImpactSF += impactSF;
  

});

// Create total row cells
Object.entries(columnMap).forEach(([label, key], colIndex) => {
  const td = document.createElement("td");
  td.style.fontWeight = "bold";
  td.style.textAlign = "center";
  td.style.backgroundColor = "#f8f9fa";
  td.style.borderTop = "2px solid #dee2e6";
  
  if (colIndex === 0) {
    // Space Group column
    td.textContent = "TOTAL";
    td.style.textAlign = "left";
  } else if (colIndex === 1) {
    // Space Type column
    td.textContent = `(${filteredData.length} room types)`;
    td.style.textAlign = "left";
  } else if (colIndex === 2) {
    // Guideline SF/Room - no total needed
    td.textContent = "-";
  } else if (colIndex === 3) {
    // Guideline # Rooms
    td.textContent = formatValue(totalGuidelineRooms);
  } else if (colIndex === 4) {
    // Guideline Total SF
    td.textContent = formatValue(totalGuidelineTotalSF);

  } else if (colIndex === 5) {
    // Existing SF/Room - no total needed
    td.textContent = "-";
  } else if (colIndex === 6) {
    // Existing # Rooms
    td.textContent = formatValue(totalExistingRooms);
  } else if (colIndex === 7) {
    // Proposed SF/Room - no total needed
    td.textContent = "-";
  } else if (colIndex === 8) {
    // Proposed # Rooms
    td.textContent = formatValue(totalProposedRooms);
  } else if (colIndex === 9) {
    // Difference SF/Room - no total needed
    td.textContent = "-";
  } else if (colIndex === 10) {
    // Difference # Rooms
    td.textContent = formatValue(totalDifferenceRooms);
    updateCellColor(td, totalDifferenceRooms);
  } else if (colIndex === 11) {
    // Impact Total SF
    td.textContent = formatValue(totalImpactSF);
    updateCellColor(td, totalImpactSF);
  }
  
  totalRow.appendChild(td);
});

tbody.appendChild(totalRow);
table.appendChild(tbody);
tableWrapper.appendChild(table);

// Adjust sticky headers after table is rendered
setTimeout(() => {
  adjustStickyHeaders();
}, 100);

// Add event listeners for window resize to adjust sticky headers
const resizeObserver = new ResizeObserver(() => {
  adjustStickyHeaders();
});

if (tableWrapper) {
  resizeObserver.observe(tableWrapper);
}
  
  // Add column group legend
  const legend = document.createElement("div");
  legend.className = "column-group-legend mt-3";
  legend.innerHTML = `
    <div class="legend-title">
      <i class="fas fa-info-circle me-2"></i>Column Group Legend
    </div>
    <div class="legend-items">
      <div class="legend-item">
        <span class="legend-color school-details-color"></span>
        <span class="legend-text">School Details - Basic room information</span>
      </div>
      <div class="legend-item">
        <span class="legend-color guidelines-color"></span>
        <span class="legend-text">Guidelines - Calculated standards</span>
      </div>
      <div class="legend-item">
        <span class="legend-color existing-color"></span>
        <span class="legend-text">Existing - Current facility data (click edit icon to toggle editing)</span>
      </div>
      <div class="legend-item">
        <span class="legend-color proposed-color"></span>
        <span class="legend-text">Proposed - Editable planning values</span>
      </div>
      <div class="legend-item">
        <span class="legend-color difference-color"></span>
        <span class="legend-text">Difference - Comparison results</span>
      </div>
    </div>
  `;
  container.appendChild(legend);
  

  // Read updated space guidelines
  if (["standard-input", "section-size", "instruction-cycles"].includes(containerId)) {
    const windowKey = {
      "standard-input": "standardInputRows",
      "section-size": "sectionCsvRows",
      "instruction-cycles": "instructionCycleRows"
    }[containerId];
  
    table.querySelectorAll("input").forEach(input => {
      // Remove any existing listeners to prevent duplicates
      input.removeEventListener("change", input._changeHandler);
      
      // Create new handler function
      input._changeHandler = () => {
        console.log(`🔄 Space Standards change detected in ${containerId}: ${input.value}`);
        syncCSVTableFromDOM(containerId, windowKey);
        
        // Clear cached room calculations to force recalculation
        window.currentRoomResults = null;
        
        // Update School Details table with new calculations
        renderSchoolDetailsTable();
        
        // Update header metrics (NSF/GSF)
        if (typeof window.updateHeaderMetrics === 'function') {
          window.updateHeaderMetrics();
        }
        
        console.log(`✅ Updated School Details table after ${containerId} change`);
      };
      
      // Add the new listener
      input.addEventListener("change", input._changeHandler);
    });
    
    console.log(`✅ Event listeners set up for ${containerId} table`);
    
    // If this is the Space Standard Input table, update SF values after initial load
    if (containerId === "standard-input") {
      setTimeout(() => {
        if (typeof window.updateSchoolDetailsSFValues === 'function') {
          window.updateSchoolDetailsSFValues();
        }
      }, 100);
    }
  }
  
  

  // Update NSF display using the same calculation method as the table total
  const totalNsf = typeof window.calculateTotalNSFFromTable === 'function' ? window.calculateTotalNSFFromTable() : 0;
  
  const nsfBox = document.getElementById("displayTotalNSF");
  if (nsfBox) {
    nsfBox.value = formatValue(totalNsf);
  }
  
  // Also update the GSF display
  const gsfBox = document.getElementById("displayTotalGSF");
  if (gsfBox) {
    const totalGSF = totalNsf * (window.gsfMultiplier || 1.5);
    gsfBox.value = formatValue(totalGSF);
  }
  
  // Update dashboard if it exists and we're on the summary tab
  if (typeof window.updateDashboard === 'function') {
    const summaryTab = document.querySelector('#summary-tab');
    if (summaryTab && summaryTab.classList.contains('active')) {
      window.updateDashboard();
    }
  }
  
  // Update header metrics if function exists (but don't call updateGSF to avoid infinite loop)
  if (typeof window.updateHeaderMetrics === 'function') {
    window.updateHeaderMetrics();
  }
  
  // Re-attach event listeners to Space Standards tables to ensure they persist
  reattachSpaceStandardsListeners();
}

function reloadSchoolDetails() {
  renderSchoolDetailsTable();
}

// Global function to adjust sticky headers
window.adjustStickyHeaders = function() {
  const tableWrapper = document.getElementById('schoolDetailsTableContainer')?.querySelector('.table-wrapper');
  if (tableWrapper) {
    const table = tableWrapper.querySelector('.data-table');
    if (table) {
      const firstHeaderRow = table.querySelector('thead tr:first-child');
      const secondHeaderRow = table.querySelector('thead tr:nth-child(2)');
      
      if (firstHeaderRow && secondHeaderRow) {
        // Get the computed height of the first row
        const firstRowHeight = firstHeaderRow.offsetHeight;
        // Set the second row to start right after the first row
        secondHeaderRow.style.top = `${firstRowHeight}px`;
        
        // Ensure the first row stays at the very top
        firstHeaderRow.style.top = '0px';
        
        console.log('Global sticky headers adjusted:', {
          firstRowHeight: firstRowHeight,
          secondRowTop: secondHeaderRow.style.top
        });
      }
    }
  }
};

// Function to re-attach event listeners to Space Standards tables
function reattachSpaceStandardsListeners() {
  console.log("🔍 Re-attaching Space Standards event listeners");
  
  const spaceStandardsContainers = ["standard-input", "section-size", "instruction-cycles"];
  
  spaceStandardsContainers.forEach(containerId => {
    const container = document.getElementById(containerId);
    if (!container) {
      console.log(`⚠️ Container ${containerId} not found`);
      return;
    }
    
    const table = container.querySelector("table");
    if (!table) {
      console.log(`⚠️ Table not found in ${containerId}`);
      return;
    }
    
    const windowKey = {
      "standard-input": "standardInputRows",
      "section-size": "sectionCsvRows", 
      "instruction-cycles": "instructionCycleRows"
    }[containerId];
    
    table.querySelectorAll("input").forEach(input => {
      // Remove any existing listeners to prevent duplicates
      input.removeEventListener("change", input._changeHandler);
      
      // Create new handler function
      input._changeHandler = () => {
        console.log(`🔄 Space Standards change detected in ${containerId}: ${input.value}`);
        syncCSVTableFromDOM(containerId, windowKey);
        
        // Clear cached room calculations to force recalculation
        window.currentRoomResults = null;
        
        // Update School Details table with new calculations
        renderSchoolDetailsTable();
        
        // Update header metrics (NSF/GSF)
        if (typeof window.updateHeaderMetrics === 'function') {
          window.updateHeaderMetrics();
        }
        
        console.log(`✅ Updated School Details table after ${containerId} change`);
      };
      
      // Add the new listener
      input.addEventListener("change", input._changeHandler);
    });
    
    console.log(`✅ Event listeners re-attached for ${containerId}`);
  });
}

function populateSpaceGroupFilter(data) {
  const filter = document.getElementById("spaceGroupFilter");
  if (!filter) {
    console.log("⚠️ Filter element not found");
    return;
  }

  const uniqueGroups = [...new Set(data.map(row => row["Core_Academic_Spaces"]).filter(Boolean))];
  console.log("🔍 Populating filter with groups:", uniqueGroups);

  filter.innerHTML = `<option value="">All</option>`;
  uniqueGroups.forEach(group => {
    const opt = document.createElement("option");
    opt.value = group;
    opt.textContent = group;
    filter.appendChild(opt);
  });
  
  console.log(`✅ Filter populated with ${uniqueGroups.length} groups`);
}

// TOP LEVEL
function waitForSectionAndCycleData(callback, attempts = 10) {
  if (window.sectionCsvRows && window.instructionCycleRows) {
    callback();
  } else if (attempts > 0) {
    setTimeout(() => waitForSectionAndCycleData(callback, attempts - 1), 200);
  } else {
    console.warn("Section or Instruction data not loaded in time.");
  }
}

window.addEventListener('DOMContentLoaded', () => {
  // Add window resize listener for sticky headers
  window.addEventListener('resize', () => {
    if (typeof window.adjustStickyHeaders === 'function') {
      setTimeout(() => {
        window.adjustStickyHeaders();
      }, 100);
    }
  });

  // Load student enrollment data first
  fetch('Student_Number_Input.csv')
    .then(response => response.text())
    .then(csvText => {
      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        complete: function(results) {
          // Find the student data row
          const studentRow = results.data.find(row => row.Type === "#-Students");
          if (studentRow) {
            const totalEnrollment = studentRow["Total Enrollment"] || "0";
            const specialEdEnrollment = studentRow["Special Education Enrollment"] || "0";
            
            // Populate the input fields
            const totalEnrollmentInput = document.getElementById("inputTotalEnrollment");
            const specialEdInput = document.getElementById("inputSpecialEdEnrollment");
            
            if (totalEnrollmentInput) {
              totalEnrollmentInput.value = totalEnrollment;
            }
            if (specialEdInput) {
              specialEdInput.value = specialEdEnrollment;
            }
            
            console.log("📊 Loaded enrollment data:", { totalEnrollment, specialEdEnrollment });
          }
        }
      });
    })
    .then(() => {
      // Then load the space summary data
      return fetch('High_School_Space_Summary.csv');
    })
    .then(response => response.text())
    .then(csvText => {
      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        complete: function(results) {
          // Filter out empty rows
          const cleaned = results.data.filter(row => row["ROOM TYPE"]);

          // List all fields that should be numbers
          const numericFields = [
            "Guideline_Room_NFA",
            "Guideline_#_Rooms",
            "Existing_Room_NFA",
            "Existing_#_Rooms",
            "Proposed_Keep_Room_NFA",
            "Proposed_Keep_#_Rooms"
          ];

          // Remove commas from all numeric fields in every row
          cleaned.forEach(row => {
            numericFields.forEach(field => {
              if (row[field]) {
                row[field] = row[field].toString().replace(/,/g, "");
              }
            });
            
            // Set all existing and proposed values to 0
            row["Existing_Room_NFA"] = "0";
            row["Existing_#_Rooms"] = "0";
            row["Proposed_Keep_Room_NFA"] = "0";
            row["Proposed_Keep_#_Rooms"] = "0";
          });

          window.schoolDetailsData = cleaned;
  
          populateSpaceGroupFilter(cleaned);

          document.getElementById("spaceGroupFilter")?.addEventListener("change", () => {
            console.log("🔍 Filter changed - re-rendering table");
            renderSchoolDetailsTable();
          });
          

          const detailsTab = document.querySelector('#details-tab');
          detailsTab.addEventListener('shown.bs.tab', () => {
            if (!window.schoolDetailsTableRendered && window.schoolDetailsData) {
              renderSchoolDetailsTable();
              window.schoolDetailsTableRendered = true;
            } else if (window.schoolDetailsTableRendered) {
              // Re-adjust sticky headers when tab is shown
              setTimeout(() => {
                const tableWrapper = document.getElementById('schoolDetailsTableContainer')?.querySelector('.table-wrapper');
                if (tableWrapper) {
                  const table = tableWrapper.querySelector('.data-table');
                  if (table) {
                    const firstHeaderRow = table.querySelector('thead tr:first-child');
                    const secondHeaderRow = table.querySelector('thead tr:nth-child(2)');
                    
                    if (firstHeaderRow && secondHeaderRow) {
                      // Get the computed height of the first row
                      const firstRowHeight = firstHeaderRow.offsetHeight;
                      // Set the second row to start right after the first row
                      secondHeaderRow.style.top = `${firstRowHeight}px`;
                      
                      // Ensure the first row stays at the very top
                      firstHeaderRow.style.top = '0px';
                    }
                  }
                }
              }, 200);
            }
          });

          if (document.querySelector('#details').classList.contains('show')) {
            waitForSectionAndCycleData(() => {
              renderSchoolDetailsTable();
              window.schoolDetailsTableRendered = true;
            });
          }
        }
        
      });
    });
    
    // Set up event listeners for enrollment inputs
    ["inputTotalEnrollment", "inputSpecialEdEnrollment"].forEach(id => {
      const input = document.getElementById(id);
      if (input) {
          input.addEventListener("input", () => {
              console.log(`🎯 Enrollment change detected: ${id} = ${input.value}`);
              
              // Clear cached room results to force recalculation
              window.currentRoomResults = null;
              
              // Update header metrics (NSF/GSF) first
              if (typeof window.updateHeaderMetrics === 'function') {
                window.updateHeaderMetrics();
              }
              
              // Re-render the school details table with new calculations
              setTimeout(() => {
                renderSchoolDetailsTable();
                console.log("✅ Table re-rendered after enrollment change");
              }, 50);
          });
      }
    });
          
    // Setup JSON viewer toggle only when formula tab is shown
    const formulaMapTab = document.querySelector('#formula-map-tab');
    if (formulaMapTab) {
      formulaMapTab.addEventListener('shown.bs.tab', () => {
      const formulaEditor = document.getElementById("formulaMapEditor");
      const toggleBtn = document.getElementById("toggleFormulaEdit");

      if (!formulaEditor || !toggleBtn) return;

      // Always refresh with current JSON
      formulaEditor.value = JSON.stringify(window.Room_Formula_Map, null, 2);

      if (!toggleBtn.dataset.bound) {
        toggleBtn.addEventListener("click", () => {
          const isReadOnly = formulaEditor.hasAttribute("readonly");
          if (isReadOnly) {
            formulaEditor.removeAttribute("readonly");
            toggleBtn.textContent = "Save Standards";
          } else {
            try {
              const parsed = JSON.parse(formulaEditor.value);
              window.Room_Formula_Map = parsed;
              toggleBtn.textContent = "Update Standards";
              formulaEditor.setAttribute("readonly", true);
              alert("Formula Map Updated!");
              renderSchoolDetailsTable(); // Refresh
            } catch (e) {
              alert("Invalid JSON. Please correct it before saving.");
            }
          }
        });
        toggleBtn.dataset.bound = "true";
      }
    });
    }
    
    // Other CSV loading - add error handling
    console.log("🔄 Starting CSV loading...");
    
    // Load CSV files with individual error handling
    const loadPromises = [
      loadCSVAndRenderTable("Space_Standard_Input.csv", "standard-input", ["Proposed"], ["Space_Type", "SF/Student", "Min SF", "Max SF", "Proposed"])
        .then(() => console.log("✅ Space_Standard_Input.csv loaded"))
        .catch(err => console.error("❌ Space_Standard_Input.csv failed:", err)),
      loadCSVAndRenderTable("Academic_Section_Size.csv", "section-size", ["Count", "Percent_Enrolled"], ["Core_Academic_Section_Size", "Count", "Percent_Enrolled"])
        .then(() => console.log("✅ Academic_Section_Size.csv loaded"))
        .catch(err => console.error("❌ Academic_Section_Size.csv failed:", err)),
      loadCSVAndRenderTable("Instruction_Cycles.csv", "instruction-cycles", ["Count"])
        .then(() => console.log("✅ Instruction_Cycles.csv loaded"))
        .catch(err => console.error("❌ Instruction_Cycles.csv failed:", err))
    ];
    
    Promise.allSettled(loadPromises).then(() => {
      console.log("✅ All CSV loading attempts completed");
      // Force a recalculation after CSV loading
      setTimeout(() => {
        if (typeof window.updateHeaderMetrics === 'function') {
          window.updateHeaderMetrics();
        }
      }, 100);
    });

    const subTabButtons = document.querySelectorAll('#spaceSubTabs button');
    subTabButtons.forEach(btn => {
      btn.addEventListener('click', function () {
        const tab = new bootstrap.Tab(this);
        tab.show();
      });
    });
  });

// Recalculate everything when the button is clicked
console.log("🔧 recalculateAll function definition loaded");
window.recalculateAll = function (btn) {
  console.log("🚀 recalculateAll function called");
  if (!btn) {
    console.log("❌ No button provided");
    return;
  }

  btn.classList.add("active");
  btn.disabled = true;
  btn.textContent = "Recalculating...";

  try {
    console.log("👉 Starting recalculateAll");
    
    // Set flag to prevent SF value updates during recalculation
    window.isRecalculatingAll = true;
    
    // Log current NSF before recalculation
    const currentNSF = typeof window.calculateTotalNSFFromTable === 'function' ? window.calculateTotalNSFFromTable() : 0;
    console.log(`📊 Current NSF before recalculation: ${currentNSF}`);
    
    console.log("🔍 About to start syncing tables...");
    
    // Also log the current header display value
    const headerNSF = document.getElementById("headerTotalNSF")?.textContent || 'N/A';
    console.log(`📊 Header NSF display before recalculation: ${headerNSF}`);

    const tabMap = {
      "standard-input": "standardInputRows",
      "section-size": "sectionCsvRows",
      "instruction-cycles": "instructionCycleRows"
    };

    console.log("🔍 Tab map created:", tabMap);
    console.log("🔍 About to iterate through tables...");

    Object.entries(tabMap).forEach(([containerId, windowKey]) => {
      const container = document.getElementById(containerId);
      if (!container) throw new Error(`Container not found: ${containerId}`);
      const table = container.querySelector("table");
      if (!table) throw new Error(`Table not found in: ${containerId}`);
      console.log(`✅ Syncing ${containerId}`);
      
      // Log data before sync
      const beforeData = window[windowKey];
      console.log(`📊 ${containerId} data before sync:`, beforeData ? beforeData.length : 'undefined', 'rows');
      if (beforeData && beforeData.length > 0) {
        console.log(`📊 ${containerId} sample before:`, beforeData[0]);
      }
      
      // Check if there are any input fields with different values
      const inputs = table.querySelectorAll("input");
      let hasChanges = false;
      inputs.forEach(input => {
        const rowIndex = input.getAttribute("data-row");
        const colName = input.getAttribute("data-col");
        if (rowIndex !== null && colName && beforeData && beforeData[rowIndex]) {
          const originalValue = beforeData[rowIndex][colName];
          const currentValue = input.value;
          if (originalValue !== currentValue) {
            console.log(`🔄 ${containerId} input change detected: row ${rowIndex}, col ${colName}: "${originalValue}" → "${currentValue}"`);
            hasChanges = true;
          }
        }
      });
      
      if (!hasChanges) {
        console.log(`✅ ${containerId} - no input changes detected`);
      }
      
      syncCSVTableFromDOM(containerId, windowKey);
      
      // Log data after sync
      const afterData = window[windowKey];
      console.log(`📊 ${containerId} data after sync:`, afterData ? afterData.length : 'undefined', 'rows');
      if (afterData && afterData.length > 0) {
        console.log(`📊 ${containerId} sample after:`, afterData[0]);
      }
    });

    console.log("✅ Rendering school details");
    
    // Log cached room results before clearing
    console.log("🔍 Cached room results before clearing:", window.currentRoomResults);
    
    // Clear cached room results to force fresh calculation
    window.currentRoomResults = null;
    
    renderSchoolDetailsTable();

    // Log NSF after recalculation
    const newNSF = typeof window.calculateTotalNSFFromTable === 'function' ? window.calculateTotalNSFFromTable() : 0;
    console.log(`📊 New NSF after recalculation: ${newNSF}`);
    console.log(`📊 NSF difference: ${newNSF - currentNSF}`);
    
    // Force update the header display
    const nsfBox = document.getElementById("headerTotalNSF");
    if (nsfBox) {
      nsfBox.textContent = newNSF.toLocaleString();
      console.log(`📊 Updated header NSF display to: ${nsfBox.textContent}`);
    } else {
      console.log(`⚠️ headerTotalNSF element not found`);
    }
    
    // Also update GSF
    const gsfBox = document.getElementById("headerTotalGSF");
    if (gsfBox) {
      const totalGSF = newNSF * (window.gsfMultiplier || 1.5);
      gsfBox.textContent = totalGSF.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 1});
      console.log(`📊 Updated header GSF display to: ${gsfBox.textContent}`);
    } else {
      console.log(`⚠️ headerTotalGSF element not found`);
    }
    
    // Also log the new header display value
    const newHeaderNSF = document.getElementById("headerTotalNSF")?.textContent || 'N/A';
    console.log(`📊 Header NSF display after recalculation: ${newHeaderNSF}`);

    // Clear the flag
    window.isRecalculatingAll = false;
    
    setTimeout(() => {
      btn.classList.remove("active");
      btn.disabled = false;
      btn.textContent = "Recalculate All";
    }, 300);
  } catch (err) {
    console.error("💥 RecalculateAll failed with error:", err?.message || err);
    alert("Recalculate failed: " + (err?.message || err));
    btn.classList.remove("active");
    btn.disabled = false;
    btn.textContent = "Error – Retry";
  }
};

console.log("✅ recalculateAll function has been defined on window object:", typeof window.recalculateAll);

// Test function to verify global access
window.testFunction = function() {
  console.log("✅ testFunction is working!");
  return "testFunction works!";
};
console.log("🔧 testFunction defined:", typeof window.testFunction);

// Update differences for a single row when a Proposed value changes
function updateDifferences(rowIndex) {
    const table = document.getElementById("schoolDetailsTableContainer").querySelector("table");
    const row = table.querySelectorAll("tbody tr")[rowIndex];
    if (!row) return;

    const cells = row.querySelectorAll("td");
    const guidelineSF = parseFloat(cells[2].textContent.replace(/,/g, "")) || 0;
    const guidelineRooms = parseFloat(cells[3].textContent.replace(/,/g, "")) || 0;
    const proposedSF = parseFloat(cells[7].querySelector("input").value.replace(/,/g, "")) || 0;
    const proposedRooms = parseFloat(cells[8].querySelector("input").value.replace(/,/g, "")) || 0;

    const diffSF = proposedSF - guidelineSF;
    const diffRooms = proposedRooms - guidelineRooms;

    cells[9].textContent = isNaN(diffSF) ? "" : formatValue(diffSF);
    cells[10].textContent = isNaN(diffRooms) ? "" : formatValue(diffRooms);

    // Calculate and update impact total SF: -(difference SF/room × difference # rooms)
    const impactTotalSF = -(diffSF * diffRooms);
    cells[11].textContent = isNaN(impactTotalSF) ? "" : formatValue(impactTotalSF);

    updateCellColor(cells[9], diffSF);
    updateCellColor(cells[10], diffRooms);
    updateCellColor(cells[11], impactTotalSF);


// Optionally, update cell styles for difference columns
if (diffSF < 0) {
    cells[9].style.backgroundColor = '#f8d7da'; // Red for negative
} else if (diffSF === 0) {
    cells[9].style.backgroundColor = '#d4edda'; // Light green for zero
} else {
    cells[9].style.backgroundColor = '#eaffea'; // Very light green for positive
}

if (diffRooms < 0) {
    cells[10].style.backgroundColor = '#f8d7da'; // Red for negative
} else if (diffRooms === 0) {
    cells[10].style.backgroundColor = '#d4edda'; // Light green for zero
} else {
    cells[10].style.backgroundColor = '#eaffea'; // Very light green for positive
}
};

function parseNumber(val) {
  return parseFloat((val || '').toString().replace(/,/g, ""));
}
