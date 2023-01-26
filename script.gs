function createForm() {
  //gets data from the spreadsheet
  const spreadsheetData = getSpreadsheetData()

  //creates a new form
  const form = FormApp.create("new form")
  form.setTitle(spreadsheetData.formTitle)

  //creates the form items
  createItems(form)

  //adds titles to the questions
  addTitles(form, spreadsheetData)

  //adds the food options to the checkbox items
  fillOptions(getOptionsList(spreadsheetData), form)

  //sets description for form and section headers
  addDescription(form)

  //move the form and make a spreadsheet to link to the form
  moveAndLink(form, spreadsheetData)

  //hides any items that need to be hidden
  setItemOrder(form)
}

function moveAndLink(form, spreadsheetData) {
  //this function moves the form into a specific folder
  //it also creates a spreadsheet in the same folder and links it to the form
  
  //gets folder for storage
  const folder = getDestinationFolder()
  
  //gets the form as a driveapp object
  const formId = form.getId()
  const formFile = DriveApp.getFileById(formId)
  //moves it into the folder and changes the filename
  formFile.moveTo(folder)
  formFile.setName(spreadsheetData.formFilename)

  //makes a copy of the template sheet and links it with the form
  const templateId = "put template id here"
  const templateSheet = DriveApp.getFileById(templateId)
  const destinationFile = templateSheet.makeCopy(spreadsheetData.spreadsheetFilename,folder)
  form.setDestination(FormApp.DestinationType.SPREADSHEET, destinationFile.getId())

  //changes name of response sheet to "Form Responses 1"
  const responseSheet = getResponseSheet(formId, destinationFile)
  responseSheet.setName("Form Responses 1")

  //copies a range of cells to new spreadsheet
  const rawSheet = SpreadsheetApp.open(destinationFile).getSheetByName("raw")
  const rawSheetCells = rawSheet.getRange(1,1,1,77)
  rawSheetCells.setValues(spreadsheetData.rawCells)
}

function getResponseSheet(formId, spreadsheetFile) {
  //this function finds the sheet that is linked to the form 
  //form.getPublishedUrl() doesn't give me the same exact string that I get from sheet.getFormUrl()
  //so I am concatenating this stuff instead to get the url ¯\_(ツ)_/¯
  const formUrl = "https://docs.google.com/forms/d/" + formId + "/viewform"
  //opens destination file as a spreadsheet
  const spreadsheet = SpreadsheetApp.open(spreadsheetFile)
  const sheets = spreadsheet.getSheets()
  //iterates through the sheets to find the one that is linked to the form
  for (let i=0; i < sheets.length; i++) {
    if (sheets[i].getFormUrl() === formUrl) {
      return sheets[i]
    }
  }
  throw "Couldn't find a sheet linked to the given form"
}

function setItemOrder(form) {
  const formItems = form.getItems()
  const shownItems = []
  const hiddenItems = []
  
  //this iterates through the form items and sorts out the ones that need to be hidden
  for (let i=0; i<formItems.length; i++) {
    if (checkIfShouldHide(formItems[i])) {
      hiddenItems.push(formItems[i])
    } else {
      shownItems.push(formItems[i])
    }
  }
  const allFormItems = shownItems.concat(hiddenItems)
  //moves the form items into the correct order
  for (let i=0; i<allFormItems.length; i++) {
    form.moveItem(allFormItems[i], i)
  }
}

function getSpreadsheetData() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet()
  const lunchSheet = spreadsheet.getSheetByName("data for form")
  const rawSheet = spreadsheet.getSheetByName("raw tab builder")
  const spreadsheetData = {}
  spreadsheetData.days = lunchSheet.getRange(1,2,1,5).getDisplayValues().flat()
  spreadsheetData.hotLunch = lunchSheet.getRange(2,2,3,5).getDisplayValues().flat()
  spreadsheetData.dailyAlaCarte = invert2dArray(lunchSheet.getRange(5,2,6,5).getDisplayValues())
  spreadsheetData.universalAlaCarte = lunchSheet.getRange(11,1,5,1).getDisplayValues().flat()
  spreadsheetData.rawCells = rawSheet.getRange(1,1,1,77).getDisplayValues()
  const nameCells = lunchSheet.getRange(17,2,3,1).getDisplayValues().flat()
  spreadsheetData.formFilename = nameCells[0]
  spreadsheetData.formTitle = nameCells[1]
  spreadsheetData.spreadsheetFilename = nameCells[2]
  return spreadsheetData
}

function invert2dArray(arr) {
  let newArr = []
  for (let i=0; i<arr[0].length; i++) {
    newArr.push([])
    for (let j=0; j<arr.length; j++) {
      newArr[i].push(arr[j][i])
    }
  }
  return newArr
}

function getDestinationFolder() {
    const folderId = "add folder id here"
    return DriveApp.getFolderById(folderId)
  }
}

function createItems(form) {
  //this function creates form items from a basic template
  form.addTextItem()
    .setTitle("Your email address")
    .setRequired(true)
    .setValidation(createEmailValidation());
  form.addTextItem()
    .setTitle("Student name: first and last")
    .setRequired(true)
    .setValidation(firstLastNameValidation());
  const student_grade = form.addListItem()
    .setTitle("Student's grade")
    .setRequired(true);
  
  const pagebreak1 = form.addPageBreakItem()
    .setTitle("Lunch order for Grades K-2");
  addSectionItems(form)
  
  const pagebreak2 = form.addPageBreakItem()
    .setTitle("Lunch order for Grades 3-5")
    .setGoToPage(FormApp.PageNavigationType.SUBMIT);
  addSectionItems(form)
  
  const pagebreak3 = form.addPageBreakItem()
    .setTitle("Lunch order for Grades 6-8")
    .setGoToPage(FormApp.PageNavigationType.SUBMIT);
  addSectionItems(form)
  
  const hidden_page_break = form.addPageBreakItem()
    .setGoToPage(FormApp.PageNavigationType.SUBMIT);
  
  student_grade.setChoices([
    student_grade.createChoice("K", pagebreak1),
    student_grade.createChoice("1", pagebreak1),
    student_grade.createChoice("2", pagebreak1),
    student_grade.createChoice("3", pagebreak2),
    student_grade.createChoice("4", pagebreak2),
    student_grade.createChoice("5", pagebreak2),
    student_grade.createChoice("6", pagebreak3),
    student_grade.createChoice("7", pagebreak3),
    student_grade.createChoice("8", pagebreak3)])
}

function addSectionItems(form) {
  //5 blank checkbox items
  form.addCheckboxItem()
  form.addCheckboxItem()
  form.addCheckboxItem()
  form.addCheckboxItem()
  form.addCheckboxItem()

  //this item will be created and then later hidden after the spreadsheet is linked
  //this is because someone's spreadsheet formulas are so tangled up that they can't be changed
  form.addTextItem()
    .setTitle("notes");
  
  //the total amount due
  form.addTextItem()
    .setTitle("Total Due");
}

function getOptionsList(spreadsheetData) {
  const hotLunch = spreadsheetData.hotLunch
  const dailyAlaCarte = spreadsheetData.dailyAlaCarte
  const universalAlaCarte = spreadsheetData.universalAlaCarte

  //creates an array to hold the arrays of choices for each question
  const checkboxChoices = []
  //creates the array as normal with hot lunch, then adds daily ala carte and universal ala carte to each array
  for (i=0; i<15; i++) {
    checkboxChoices[i] = []
    //determines whether there is school that day by seeing if there is hot lunch
    if (hotLunch[i] != "") {
      //if hot lunch is not empty then this creates the array of options as normal
      checkboxChoices[i].push(hotLunch[i])
      checkboxChoices[i].push(...dailyAlaCarte[i%5])
      checkboxChoices[i].push(...universalAlaCarte)
      //filter boolean will remove any empty strings
      checkboxChoices[i] = checkboxChoices[i].filter(Boolean)
    } else {
      //if there is no school that day the array will just have the string "none"
      checkboxChoices[i].push("none")
    }
  }
  return checkboxChoices
}

function addTitles(form, spreadsheetData) {
  //adds titles to checkbox questions
  const days = spreadsheetData.days
  const cboxItems = form.getItems(FormApp.ItemType.CHECKBOX)
  for (let i=0; i<15; i++) {
    cboxItems[i].setTitle(days[i%5])
  }
}

function fillOptions(allChoices, form) {
  //this function fills in the options for each checkbox item
  const cboxItems = form.getItems(FormApp.ItemType.CHECKBOX).map(item => item.asCheckboxItem())
  for (let i=0; i<cboxItems.length; i++) {
    cboxItems[i].setChoiceValues(allChoices[i])
  }
}

function addDescription(form) {
  //also this assumes that there is at most 1 pizza day in a week
  //and it also assumes that all grades have pizza if any grade has pizza
  items = form.getItems(FormApp.ItemType.CHECKBOX)

  let daysOfTheWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  let pizzaDay;
  let pizzaOrderDue;
  //loops through the first 5 checkbox questions and checks if any of them are pizza days
  for (let i=0; i<5; i++) {
    //if it's a pizza day we get the names of the day when pizza is served and the day when pizza order is due
    if (checkIfPizzaDay(items[i])) {
      pizzaDay = daysOfTheWeek[i+1];
      pizzaOrderDue = daysOfTheWeek[i];
      break;
    }
  }

  let description;
  if (pizzaDay) {
    description = `Orders are due by 8:30 a.m. the day of lunch, except ${pizzaDay}'s Papa John's lunch orders are due ${pizzaOrderDue} at noon.`;
  } else {
    description = "Orders are due by 8:30 a.m. the day of lunch.";
  }
  //sets the form description
  form.setDescription(description);
  //sets the description for section headers
  form.getItems(FormApp.ItemType.PAGE_BREAK).forEach(item => {
    item.setHelpText(description);
  })
}

function checkIfPizzaDay(item) {
  let cboxItem = item.asCheckboxItem()
  let isPizzaDay = false
  //checks each choice for the given item to see if it includes "Papa John's Pizza"
  cboxItem.getChoices().forEach(choice => {
    let choiceValue = choice.getValue()
    if (choiceValue.includes("Papa John's Pizza")) {
      isPizzaDay = true
    }
  })
  return isPizzaDay
}

function checkIfShouldHide(item) {
//checks if an item needs to be hidden because it corresponds to a day without school
//if there is school the choices array should always have more than one item
  if (item.getType() == FormApp.ItemType.CHECKBOX) {
    if (item.asCheckboxItem().getChoices().length === 1) {
      return true 
    }
  } else if (item.getType() == FormApp.ItemType.TEXT) {
    //this will find the text items that are created for spreadsheet purposes only and need to be hidden
    if (item.asTextItem().getTitle() === "notes") {
      return true
    }
  }
  return false
}

function createEmailValidation() {
  let textValidation = FormApp.createTextValidation()
    .requireTextIsEmail()
    .build();
  return textValidation
}

function firstLastNameValidation() {
//this function makes sure there is a space somewhere in the middle
//because some idiots only type in the first name
  let textValidation = FormApp.createTextValidation()
    .requireTextContainsPattern("\\w\\s\\w")
    .build();
  return textValidation
}
