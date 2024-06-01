import { askGPT } from "./gpt.js";

// import { GoogleGenerativeAI } from 'generative-ai';
const API_KEY = "";
const apiUrl = 'https://api.openai.com/v1/chat/completions';

document.getElementById('footer-link').addEventListener('click', function() {//onClick for footer's link
  const url = 'https://www.nytimes.com/games/wordle'; 
  window.open(url, 'popup', 'width=800,height=600');
});
document.getElementById('footer-right').addEventListener('click', function() {//onClick for footer's link
  const url = 'https://www.tomsguide.com/news/what-is-todays-wordle-answer'; 
  window.open(url, 'popup', 'width=800,height=600');
});


// const endpoint = "https://generativelanguage.googleapis.com/v1beta";

// const genAI = new GoogleGenerativeAI(API_KEY);
// const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash"});

//const endpoint = `https://generativelanguage.googleapis.com/v1beta/gemini-1.5-flash:generateText?${API_KEY}`;

chrome.runtime.connect({ name: 'mySidepanel' });
console.log("This is the side panel");

var allValidGuesses = [];
var letterFrequencies  = [];
var validAnswers = [];
var validGuesses = [];
var gray = new Set();

var storageCache = [];
var numRows = 0;
var elem = document.getElementById("inner");//progress bar animation
var width = 0;
var id = setInterval(frame, 10);
function frame() {//manages the progress bar
  console.log("Witdh", width);
  if(width == 100)
    numRows = 7;
  if (width > (numRows/6)*100) {
    clearInterval(id);
  } else {
    width++;
    elem.style.width = width + '%';
    if(width >= 100)
      elem.innerHTML = '100%';
  }
}
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {//reload method
  if (request.action == 'reload') {
    console.log("Reloading------>NOW")
    window.location.reload();
  }
});
const init = async() => {
  allValidGuesses = await parseCSV("../validGuesses.csv");
  //var temp = await parseCSV(".../answers.scv")
  letterFrequencies = await parseCSV("../letterFrequency.csv");
  validGuesses = [...allValidGuesses[0]];
  //var validAnswers = [...letterFrequencies];
  //console.log(validGuesses);
}

const initStorageCache = chrome.storage.session.get().then((items) => {
  //Object.assign(storageCache, items);
  storageCache = items.rows || [];
});

async function parseCSV(file) {
  const response = await fetch(file);
  const csvString = await response.text();
  const data = [];
  const lines = csvString.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const columns = lines[i].split(",");
    data.push(columns);
  }
  return data;
}

function nextGuess(word, colors){//data_states =  empty, tbd, absent, present, correct
  var greenYellow = new Map();
  if(word == "no message")
    return;
  numRows++;
  for(let i = 0; i < word.length; i ++){//accounts for reoccurance of letters
      if(colors[i] === 'correct' || colors[i] === 'present'){
          if(greenYellow.has(word[i]))
              greenYellow.set(word[i], greenYellow.get(colors[i]) + 1);
          else
              greenYellow.set(word[i], 1);
      }else if(colors[i] === 'absent')
          gray.add(word[i]);
  }
  let newValidGuesses = [];
  console.log(validGuesses.length);
  for(let i = 0; i < validGuesses.length; i ++) {
      var isPossible = true;
      if(!compareFreq(greenYellow, validGuesses[i])) 
          continue;
      for(let j = 0; j < word.length; j++){
          if(colors[j] === 'correct'){
              if(validGuesses[i].charAt(j) != word[j]) {
                  isPossible = false;
                  //console.log(`indexOf ${word[j]} in ${validGuesses[j]} and ${word}`);
                  break;
              }
          }else if(colors[j] == 'present'){
              if(validGuesses[i].indexOf(word[j]) === j || validGuesses[i].indexOf(word[j]) === -1){//double letters
                  isPossible = false;
                  //console.log(`indexOf ${word[j]} in ${validGuesses[i]} and ${word}`);
                  break;
              }
          }else if(colors[j] == 'absent'){
              //gray.push(word.[j]);double letters
              if(word[j] === validGuesses[i].charAt(j)){
                  isPossible = false;
                  //console.log(validGuesses[j]);
                  break;
              }
          }
      }
      if(isPossible){
        newValidGuesses.push(validGuesses[i]);  
      }
  }
  validGuesses = [...newValidGuesses];
  validAnswers = [...newValidGuesses];//valid guesses == valid answers
  //determining the rankings of all the new possible guesses
   var guessRanks = new Map();
   console.log(`Length: ${newValidGuesses.length}`);
  //for(let i = 0; i < allValidGuesses[0].length; i++){//antiquated and inefficient 
    // let temp = allValidGuesses[0][i];
    // var num = checkStats(temp);
    // guessRanks.set(temp, num);\
 // }
  //checkStats("apple");
  // checkStats("abler").then(() => {
  //     console.log("AI is done");
  // });
  console.log("next step");
  // guessRanks = sortMap(guessRanks);
  // let arr = [];
  // for (let [key, value] of newMap) {
  //   console.log(key + " is " + value);
  //   arr.push(key);
  // }
  // validGuesses = [...arr];
  // validAnswers = [...arr];
}

function getFreq(word){
  var lettersOccurrence = new Map();
  for(let i = 0; i < word.length; i++)
      if(lettersOccurrence.has(word[i]))
          lettersOccurrence.set(word[i], lettersOccurrence.get(word[i]) + 1);
      else
          lettersOccurrence.set(word[i], 1);
  return lettersOccurrence;
}

function compareFreq(greenYellow, word){
  var lettersOccurrence = getFreq(word);
  lettersOccurrence.forEach(element => {
      if(!lettersOccurrence.has(element))
          return false;
      else if(greenYellow.get(element) != lettersOccurrence.get(element))
          return false;
  });
  return true;
}

function sortMap(map) {
  return new Map([...map].sort((a, b) => a[0].localeCompare(b[0])));
}

async function checkStats(word){  //antiquated
  console.log("Checking Stats");

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        'Content-Type': 'application/json',
        'Authorization': API_KEY
      },
      body: JSON.stringify({
        "model": "gpt-3.5-turbo",
        "messages": [{
            "role": "system",
            "content": "You are ChatGPT, a helpful assistant."
        }, {
            "role": "user",
            "content": "Generate a five letter word in all capital letters."
        }]
      })
    });
    const responseData = await response.json();
    const text = responseData.choices[0].message.content;
    console.log(text);
  } catch (error) {
    console.error(error);
  }

  // const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash"});

  // const prompt = "Generate a 5 letter word in all capital letters."

  // const result = await model.generateContent(prompt);
  // const response = await result.response;
  // const text = response.text();
  // console.log(text);

  /*const prompt = "Generate a 5 letter word in all capitals."; using fetch
  const requestBody = {
    "model": "gemini-1.5-flash",
    "prompt": prompt
  };

  try {
    const response = await fetch(`${endpoint}/projects/-/locations/-/models/gemini-1.5-flash:generateText`, {
      method: "POST",
      headers: {
        'Content-Type': 'application/json',
        'X-GEMINI-APIKEY': API_KEY
      },
      body: JSON.stringify(requestBody)
    });

    const responseData = await response.json();
    const text = responseData.text;
    console.log(text);
  } catch (error) {
    console.error(error);
  }*/

  

  // fetch(endpoint, {
  //   method: "POST",
  //   headers: {
  //     "Content-Type": "application/json",
  //     "Authorization": `Bearer ${API_KEY}`
  //   },
  //   body: JSON.stringify(requestBody)
  // })
  // .then(response => response.json())
  // .then(data => {
  //   const text = data.content.text;
  //   console.log(text);
  // });
  var ratio = 0.0;
  const ansNumOriginal = validAnswers.length; //point of comparison for all words
  // for(let i = 0; i < validAnswers.length; i++){//ai give weight to answers
  //   var colors =  getColors(word, validAnswers[i]);//if i was the answer what would be the color thing
  //   var newValidAnswers = nextGuessStat(word, colors);
  //   ratio += newValidAnswers/ansNumOriginal;
  //   //calculate the total reduced == reduced weighted/total weighted
  // }
  //console.log(`${word} = ${ratio}`);
  // return ratio;
}

function getColors(guess, answer){
    var colors = [];
    for(let i = 0; i < guess.length; i++){
      let guessLetter = guess.charAt(i);
      if(answer.charAt(i) == guessLetter)
        colors[i] = 'present';
      else if(getCharFreq(guess, guessLetter) == 1 && answer.indexOf(guessLetter) >= 0)
        colors[i] = 'correct';
      else if(answer.indexOf(guessLetter) == -1)
        colors[i] = 'absent';
    }

    //inserts repeated letters into display
    for(let i = 0; i < guess.length; i++){
      if(getCharFreq(guess, guess.charAt(i)) > 1 && answer.charAt(i) != guess.charAt(i))
        if(!(getCharFreq(guess, guess.charAt(i)) == getCharFreq(answer, guess.charAt(i))))//determines if the # of repeated letters in the guess matches the # of repeated letters in the answer
          colors[i] = 'correct';
        else
        colors[i] = 'absent';
    }
  return colors;
}
 
  function getCharFreq(word, c){
    var freq = 0;
    for(let i = 0; i < word.length; i++)
      if(word.charAt(i) === c)
        freq++;
    return freq;
  }

init().then(() => {
  console.log()
  initStorageCache.then(() => {//retrieving data from storage
    //numRows = storageCache.length;
    for(let j = 0; j < storageCache.length; j++){
      let options = storageCache[j];
      const { action, word, colors } = options;
      console.log('Cached options:', action, word, colors);
      var fullWord = "";
      for(let i = 0; i < word.length; i++)
        fullWord += word[i];
      //document.getElementById('word-container').innerHTML += fullWord + '<br>'; // append to the container
      console.log(validGuesses);
      nextGuess(word, colors);//process the new word
      console.log(validGuesses);
      console.log("next Guess");
      var guesses = document.getElementById("Guesses");
      while (guesses.firstChild) {
        guesses.removeChild(guesses.firstChild);
      }
      
      const bestGuesses = getBestGuesses(validGuesses, 30);
      //console.log(askGPT("Can you give me the name of a random province in China and tell me about its culture in one sentence"));
      var greenCnt = 0;
      for(let i = 0; i < colors.length; i++){
        if(colors[i] === 'correct')
          greenCnt++;
      }
      console.log(`${word}: ${greenCnt}`);
      if(greenCnt == 4){//somewhat like a AI-tiebreaker
        var optimalGuess = "";
        const response = askGPT(`Choose a 5-letter word in this array of possible solutions that narrows down the solution the most in Wordle: ${bestGuesses}. Return only your chosen word in lower-case.`);
        // console.log(response);
        response.then(result => {
          console.log("Result", result);
          if(result.length == 5){//checks if there is excess response
            console.log("Adding AI word");
            let entry = document.createElement('li');
            entry.style.color = 'darkred';
            var link = document.createElement('a');
            link.href = `https://en.wiktionary.org/wiki/${result}`;
            var img = document.createElement('img');
            img.style.marginLeft = '10px';
            img.src = chrome.runtime.getURL("../images/linkIcon-16.png");
            link.append(img);
            entry.appendChild(document.createTextNode(`AI Suggestion: ${result}`));
            entry.append(link);
            guesses.appendChild(entry);
          }
        }).catch(error => {
          console.error('Promise rejected with:', error);
      });
      }else if(greenCnt == 5){
        width = 100;
      }
      for(let i = 0; i < Math.min(30, bestGuesses.length); i++){//add all guesses to list

        let entry = document.createElement('li');
        var link = document.createElement('a');
        link.href = `https://en.wiktionary.org/wiki/${bestGuesses[i]}`;
        var img = document.createElement('img');
        img.style.marginLeft = '10px';
        img.src = chrome.runtime.getURL("../images/linkIcon-16.png");
        link.append(img);
        entry.appendChild(document.createTextNode(bestGuesses[i]));
        entry.append(link);
        guesses.appendChild(entry);
      }
      const div = document.getElementById('inner');
      div.scrollTop = 0;
    }
    // location.reload();
  });
});

const getBestGuesses = (words, numGuesses) => {
  let letterCounts = {};
  for (let i = 0; i < words.length; i++) {
    let word = words[i].toLowerCase();
    for (let j = 0; j < word.length; j++) {
        let letter = word[j];
        if (/^[a-zA-Z]$/.test(letter)) {
            if (letterCounts[letter]) {
                letterCounts[letter]++;
            } else {
                letterCounts[letter] = 1;
            }
        }
    }
  }
  // console.log("Letter Counts: ", letterCounts);
  let wordScores = {};
  for(let i = 0; i < words.length; i++){
    const wordScore = calculateWordScore(letterCounts, words[i]);
    
    if (!wordScores.hasOwnProperty(wordScore)) {
      wordScores[wordScore] = [];
    }
    wordScores[wordScore].push(words[i]);
  }
  console.log("Word Scores: ", wordScores);
  let keys = Object.keys(wordScores);//keySet -> sorted key array
  for(let i = 0; i < keys.length; i++){
    keys[i] = parseInt(keys[i]);
  }
  keys.sort();
  let output = [];
  let index = keys.length - 1;
  while(output.length < numGuesses){
    let key = keys[index];
    if(!key)//if total left < numGuesses
      break;
    console.log("Key", key, "wordScores", wordScores[key]);
    for(let i = 0; i < wordScores[key].length; i++){
      output.push(wordScores[key][i]);
      if(output.length >= numGuesses){
        break;
      }
    }
    index--;
  }
  return output;
}

const calculateWordScore = (letterCounts, word) => {
  let wordScore = 0;
  let countedLetters = {}; 
  
  for (let i = 0; i < word.length; i++) {
      const letter = word[i];
      if (!countedLetters[letter]) {
          wordScore += Math.round(10 * Math.sqrt(letterCounts[letter]));
          countedLetters[letter] = true;
      }
  }
  
  return wordScore;
}
