
module.exports = {
  DifferenceInDays:differenceInDays,
  FormatNumberForDisplay:formatNumberForDisplay,
  SplitString:splitString
}
function splitString (string, size) {
  let splitStrings = new Array();

  let newline = '\n';
  let re = new RegExp(newline, 'g');
  let newLineIndexes = new Array();
  while (re.exec(string)){
    newLineIndexes.push(re.lastIndex);
  }

  let index = 0;
  for(let i = 0; i < newLineIndexes.length; i++)
  {
    let newIndex = newLineIndexes[i];
    if(newIndex > (size+index))
    {
      splitStrings.push(string.substring(index,newIndex));
      index = newIndex;
    }
  }
  splitStrings.push(string.substring(index, string.length));

  return splitStrings;
}


function differenceInDays(d0, d1) {
  // Copy dates so don't affect originals
  d0 = new Date(+d0);
  d1 = new Date(+d1);

  // Set to noon
  d0.setHours(12,0,0,0);
  d1.setHours(12,0,0,0);

  // Get difference in whole days, divide by milliseconds in one day
  // and round to remove any daylight saving boundary effects
  return Math.round((d1-d0) / 8.64e7)
}

function formatNumberForDisplay(number) {
  let length = Math.round(number).toString().length;
  let pretty = ``;

  if(length <= 3)
    pretty = Math.round(number).toString();
  else if(4 <= length && length <= 6)
    pretty = `${Math.round(number/1000 * 10) / 10}k`; //thousands
  else if(7 <= length && length <= 9)
    pretty = `${Math.round(number/1000000 * 10) / 10}m`; //millions
  else if(10 <= length && length <= 12)
    pretty = `${Math.round(number/1000000000 * 10) / 10}b`; //billions
  else if(11 <= length && length <= 15)
    pretty = `${Math.round(number/1000000000000 * 10) / 10}t`; //trillions
  else
    pretty = `lol`;

  return pretty;
}
