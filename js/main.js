
function process(str) {
  const lines = str.split(/\r?\n/).filter(line => line.length > 0);
  viewer.innerHTML = lines
    .reduce(
      ([state, result], line) =>
        [state, result += parseLine(state, line)],
      [{}, ""])[1];
}

function parseLine(state, line) {
  if (line.length !== 94) {
    return `<pre>${line}</pre>`;
  }
  const parsers = [
    parseFileHeaderRecord,
    parseFileTrailerRecord,
    parseBatchHeaderRecord,
    parseBatchTrailerRecord,
    parseEntryRecord,
    parseAddendaRecord,
  ];
  for (const parser of parsers) {
    const record = parser(state, line);
    if (record) {
      return `<div class="line ${record.type}">${formatRecord(record)}</div>`;
    }
  }
  return `<pre>${line}</pre>`;
}

function formatRecord(record) {
  return record.fields
    .map(field => `<pre title="${field.title}">${field.value.replaceAll(" ", "<span class='space'> </span>")}</pre>`)
    .join("");
}

function parseFileHeaderRecord(state, line) {
  return line.charAt(0) !== '1' ? null : {
    type: "file-header",
    fields: [
      { value: line.substring(0, 1), title: "Record Type Code" },
      { value: line.substring(1, 3), title: "Priority Code" },
      { value: line.substring(3, 13), title: "Immediate Destination" },
      { value: line.substring(13, 23), title: "Immediate Origin" },
      { value: line.substring(23, 29), title: "File Creation Date" },
      { value: line.substring(29, 33), title: "File Creation Time" },
      { value: line.substring(33, 34), title: "File ID Modifier" },
      { value: line.substring(34, 37), title: "Record Size" },
      { value: line.substring(37, 39), title: "Blocking Factor" },
      { value: line.substring(39, 40), title: "Format Code" },
      { value: line.substring(40, 63), title: "Immediate Destination Name" },
      { value: line.substring(63, 86), title: "Immediate Origin Name" },
      { value: line.substring(86), title: "Reference Code" },
    ]
  };
}

function parseFileTrailerRecord(state, line) {
  if (line.charAt(0) !== '9') {
    return null;
  }
  if (line.match(/^9+$/)) {
    return {
      type: "file-padding",
      fields: [
        { value: line, title: "File Padding" }
      ]
    };
  }
  return {
    type: "file-trailer",
    fields: [
      { value: line.substring(0, 1), title: "Record Type Code" },
      { value: line.substring(1, 7), title: "Batch Count" },
      { value: line.substring(7, 13), title: "Block Count" },
      { value: line.substring(13, 21), title: "Entry/Addenda Count" },
      { value: line.substring(21, 31), title: "Entry Hash" },
      { value: line.substring(31, 43), title: "Total Debit Entry Dollar Amount in File" },
      { value: line.substring(43, 55), title: "Total Credit Entry Dollar Amount in File" },
      { value: line.substring(55), title: "Reserved" },
    ]
  };
}

function parseBatchHeaderRecord(state, line) {
  if (line.charAt(0) !== '5') {
    return null;
  }
  state.standardClassCode = line.substring(1, 4);
  return {
    type: "batch-header",
    fields: [
      { value: line.substring(0, 1), title: "Record Type Code" },
      { value: line.substring(1, 4), title: "Service Class Code" },
      { value: line.substring(4, 20), title: "Company Name" },
      { value: line.substring(20, 40), title: "Company Discretionary Data" },
      { value: line.substring(40, 50), title: "Company Identification" },
      { value: line.substring(50, 53), title: "Standard Entry Class Code" },
      { value: line.substring(53, 63), title: "Company Entry Description" },
      { value: line.substring(63, 69), title: "Company Descriptive Date" },
      { value: line.substring(69, 75), title: "Effective Entry Date" },
      { value: line.substring(75, 78), title: "Settlement Date (Julian)" },
      { value: line.substring(78, 79), title: "Originator Status Code" },
      { value: line.substring(79, 87), title: "Originating DFI Identification" },
      { value: line.substring(87), title: "Batch Number" },
    ]
  };
}

function parseBatchTrailerRecord(state, line) {
  if (line.charAt(0) !== '8') {
    return null;
  }
  delete state.standardClassCode;
  return {
    type: "batch-trailer",
    fields: [
      { value: line.substring(0, 1), title: "Record Type Code" },
      { value: line.substring(1, 4), title: "Service Class Code" },
      { value: line.substring(4, 10), title: "Entry/Addenda Count" },
      { value: line.substring(10, 20), title: "Entry Hash" },
      { value: line.substring(20, 32), title: "Total Debit Entry Dollar Amount" },
      { value: line.substring(32, 44), title: "Total Credit Entry Dollar Amount" },
      { value: line.substring(44, 54), title: "Company Identification" },
      { value: line.substring(54, 73), title: "Message Authentication Code" },
      { value: line.substring(73, 79), title: "Reserved" },
      { value: line.substring(79, 87), title: "Originating DFI Identification" },
      { value: line.substring(87), title: "Batch Number" },
    ]
  };
}

function parseEntryRecord(state, line) {
  if (line.charAt(0) !== '6') {
    return null;
  }
  return {
    type: "entry",
    fields: [
      { value: line.substring(0, 1), title: "Record Type Code" },
      { value: line.substring(1, 3), title: "Transaction Code" },
      { value: line.substring(3, 11), title: "Receiving DFI Identification" },
      { value: line.substring(11, 12), title: "Check Digit" },
      { value: line.substring(12, 29), title: "DFI Account Number" },
      { value: line.substring(29, 39), title: "Amount" },
      { value: line.substring(39, 54), title: "Identification Number" },
      { value: line.substring(54, 76), title: "Receiving Individual/Company Name" },
      { value: line.substring(76, 78), title: "Discretionary Data / Payment Type Code" },
      { value: line.substring(78, 79), title: "Addenda Record Indicator" },
      { value: line.substring(79), title: "Trace Number" },
    ]
  };
}

function parseAddendaRecord(state, line) {
  if (line.charAt(0) !== '7') {
    return null;
  }
  let fields;
  switch (line.substring(1, 3)) {
    case "98":
      fields = [
        { value: line.substring(0, 1), title: "Record Type Code" },
        { value: line.substring(1, 3), title: "Addenda Type Code" },
        { value: line.substring(3, 6), title: "Change Code" },
        { value: line.substring(6, 21), title: "Original Entry Trace Number" },
        { value: line.substring(21, 27), title: "Reserved" },
        { value: line.substring(27, 35), title: "Original Receiving DFI Identification" },
        { value: line.substring(35, 64), title: "Corrected Data" },
        { value: line.substring(64, 79), title: "Reserved" },
        { value: line.substring(79), title: "Trace Number" },
      ];
      break;
    case "99":
      fields = [
        { value: line.substring(0, 1), title: "Record Type Code" },
        { value: line.substring(1, 3), title: "Addenda Type Code" },
        { value: line.substring(3, 6), title: "Return Reason Code" },
        { value: line.substring(6, 21), title: "Original Entry Trace Number" },
        { value: line.substring(21, 27), title: "Date of Death" },
        { value: line.substring(27, 35), title: "Original Receiving DFI Identification" },
        { value: line.substring(35, 79), title: "Addenda Information" },
        { value: line.substring(79), title: "Trace Number" },
      ];
      break;
    default:
      fields = [
        { value: line.substring(0, 1), title: "Record Type Code" },
        { value: line.substring(1, 3), title: "Addenda Type Code" },
        { value: line.substring(3, 83), title: "Payment Related Information" },
        { value: line.substring(83, 87), title: "Addenda Sequence Number" },
        { value: line.substring(87), title: "Entry Detail Sequence Number" },
      ];
      break;
  }
  return { type: "addenda", fields };
}

const viewer = document.getElementById("viewer");
const editor = document.getElementById("editor");
editor.addEventListener("input", (event) => {
  process(event.target.value);
});
process(editor.value);
