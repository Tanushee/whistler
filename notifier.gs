function shortenUrl(urll, callback) {
   Logger.log("Inside ShortenURL methoddd");
  var url = 'https://www.googleapis.com/urlshortener/v1/url';
  var apiKey = 'AIzaSyBcNrAnvs-djLk6F6Dl02qO_pHCkHaZBeI';
  url += '?key=' + apiKey;
  var payload = {
    "longUrl": urll
  };
  var parameters = {
    method: 'post',
    payload: JSON.stringify(payload),
    contentType: 'application/json',
    muteHttpExceptions: true
  };

  var response = UrlFetchApp.fetch(url, parameters);
  var jsonResponse = JSON.parse(response);
  var shortURL = jsonResponse["id"];

  Logger.log("*** PAYLOAD is: " + shortURL);
  callback(shortURL);
}

function onEdit(e) {
  Logger.log("Inside onEdit");
  var range = e.range;
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getActiveSheet();
  var columnName = sheet.getRange(1, range.getColumn()).getDisplayValues();
  var columnNumber = range.getColumn();
  var column = "";
   

  if (columnName === 'undefined' || columnName == '') {
    column = columnNumber;
    Logger.log("Inside else The column number is: " + column);
  } else {
    column = columnName;
    Logger.log("Inside If The column name is: " + column);
  }

  var userName = e.user.email;
//  range.setNote("Username: "+userName);
  var userName = Session.getEffectiveUser().getUserLoginId();

  Logger.log("Get effective user " + userName);

  if (userName.length <= 0) {
    userName = "Anonymous";
  }

 var processorSheet = getProcessorSheet();
 var dataRange = processorSheet.getDataRange();
 var range2 = processorSheet.getRange(dataRange.getLastRow()+1,dataRange.getLastColumn());

  var columnStart = e.range.columnStart;
  var columnEnd = e.range.columnEnd;
  var rowStart =e.range.rowStart;
  var rowEnd = e.range.rowEnd;
 
  var value = e.value;
  var oldValue = e.oldValue;
  
  if(columnStart == columnEnd && rowStart == rowEnd){ // Single cell changed
//    Logger.log("Same column and row affected");
    if(typeof e.oldValue === 'undefined' && JSON.stringify(e.value)!='{}'){ // Add new value
      range2.setValue('*'+userName + '* added *' + value + '*\n Column: *' + column + '* Sheet: ' + sheet.getSheetName() + '\n Document: ' + ss.getName());
    }
    else if(typeof e.oldValue === 'undefined' && JSON.stringify(e.value)=='{}'){
      Logger.log("Range.getValue-->"+range.getValue());
      range2.setValue('*'+userName + '* pasted *' + range.getValue() + '*\n Column: *' + column + '* Sheet: ' + sheet.getSheetName() + '\n Document: ' + ss.getName());
    }
    else if(JSON.stringify(e.oldValue)!='{}' && value.oldValue===oldValue ){ // Delete cell's value
      range2.setValue('*'+userName + '* deleted *' + oldValue + '*\n Column: *' + column + '* Sheet: ' + sheet.getSheetName() + '\n Document: ' + ss.getName());
     }
    else if(JSON.stringify(e.value)!='{}' && JSON.stringify(e.oldValue)!='{}'){ // Modify cell's value
      if (oldValue == value) { // Added case for cell formatting. It fails at times -- Check if this is ever called!!
        range2.setValue('*'+ userName + '* reformatted *' + oldValue + '*\n Column: *' + column + '*Sheet: ' + sheet.getSheetName() + '\n Document: ' + ss.getName());
      } else {
        range2.setValue('*'+userName + '* changed *' + oldValue + '* to *' + value + '*\n Column: *' + column + '* Sheet: ' + sheet.getSheetName() + '\n Document: ' + ss.getName());
      }
    }
   }
  else if(columnStart == columnEnd && rowStart != rowEnd){ // Changes in multiple rows in a single column
    range2.setValue('*'+userName + '* has done mass edit across rows.' + '\n Column: *' + column + '* Sheet: ' + sheet.getSheetName() + '\n Document: ' + ss.getName());

  }
  else if(columnStart != columnEnd && rowStart == rowEnd){ // changes in multiple columns but in a single row
    range2.setValue('*'+userName + '* has done mass edit across columns.' + '\n Row: *' + rowStart + '* Sheet: ' + sheet.getSheetName() + '\n Document: ' + ss.getName());
  }
  else if (columnStart != columnEnd && rowStart != rowEnd){ // changes in multiple rows and columns @Saransh - We can print multiple row start, end and column start, end in here.
        range2.setValue('*'+userName + '* changed values across rows and columns.' + '\n Sheet: ' + sheet.getSheetName() + '\n Document: ' + ss.getName());
  }
}

function sendHttpPost(message) {
  var flockMessage = {
    "text": ""
  };
  var options = {
    "method": "post",
    "contentType": "application/json"
  };
   flockMessage.text = message;
  options.payload = (JSON.stringify(flockMessage));

  var response = UrlFetchApp.fetch("https://api.flock.co/hooks/sendMessage/fee3ef72-454e-4642-bd21-b1094d1d359e", options);
  Logger.log("Response ->" + response.getContentText());
}

function getProcessorSheet(){
  var activeSpreadSheet = SpreadsheetApp.getActiveSpreadsheet();
  var processorsheet = activeSpreadSheet.getSheetByName("ProcessorSheet-191412");
  Logger.log("Processor sheet "+processorsheet);
  if(processorsheet != null ){
    Logger.log("return already present sheet");
    return processorsheet;
  }else{
   Logger.log("Create new sheet");
   return activeSpreadSheet.insertSheet("ProcessorSheet-191412").hideSheet();
  }
}


function checkOutstandingNotes3() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var combinedMessageDigest = "";

    var sheet = ss.getSheetByName("ProcessorSheet-191412");
    var dataRange = sheet.getDataRange();
    var range = sheet.getRange(1, 1, dataRange.getLastRow()+1, dataRange.getLastColumn()+1); // @Saransh we will loop from starting to last row, column that contains data.
    var results = range.getValues();
//    Logger.log("Results---->" + results);

    var URLname = ss.getUrl();
    var totalNoteCount = 0;
    var MessageArray = new Array();

    for (var i in results) {
      for (var j in results[i]) {
        if (results[i][j]) {
          Logger.log("The result is: " + results[i][j]);
          totalNoteCount++;
          combinedMessageDigest = combinedMessageDigest + "\n" + results[i][j]+ "\n";
          MessageArray.push(results[i][j]);
        }
      }
    }
    if (MessageArray.length <= 4) {
      for (n = 0; n < MessageArray.length; n++) {
        shortenUrl(URLname, function(url) {
          sendHttpPost(MessageArray[n]+" "+url);
        });
      }
    }
    if (totalNoteCount > 4 && totalNoteCount < 20) { // these magic numbers need to be tested for reasonable limits 
      shortenUrl(URLname, function(url) {
        sendHttpPost("Sending combined digest for " + totalNoteCount + " messages: \n" + combinedMessageDigest +" "+ url);
      });
    } else if (totalNoteCount >= 20) {
      shortenUrl(URLname, function(url) {
        sendHttpPost("Mass edit ahs been done! You can check out changes in the original sheet -> "+" "+url); // <----------------- mass edits could mean anything. col, row del are one type of mass edit we can handle and say exactly if a row of Col was deleted. Other sorts of edits which can be recognized can have a generic msg
      });
    }
    range.clear();
}


function onChange(){
  Logger.log("----------- On change---------");
  sendHttpPost("Structural change detected");
}

function onOpen() {
  Logger.log("Inside on Open");
  var ui = SpreadsheetApp.getUi();
  // Or DocumentApp or FormApp.
  ui.createMenu('Sheet Notifier Menu')
      .addItem('Configure url', 'menuItem1')
      .addToUi();
   var options = {
    "method": "post",
    "contentType": "application/json",
    "text": "Success!"
  };
//  var response1 = UrlFetchApp.fetch("https://api.flock.co/hooks/sendMessage/937fc3b6-79e4-466e-ad23-8e8af0fcab9c", options); // Deep space group

}

function menuItem1() {
  var ui = SpreadsheetApp.getUi();
  var promptResponse = ui.prompt("configure sheet notifier info","enter your incoming webhook url",ui.ButtonSet.YES_NO);
  if (promptResponse.getSelectedButton() == ui.Button.YES) {
  var responseText = promptResponse.getResponseText();
  Logger.log("Response text ---"+responseText);
  var scriptStorage = PropertiesService.getScriptProperties();
  scriptStorage.setProperty('url', responseText);
 } else if (response.getSelectedButton() == ui.Button.NO) {
   Logger.log("No change in url");
 } else {
   Logger.log("The user clicked the close button in the dialogs title bar.");
 }  
}

