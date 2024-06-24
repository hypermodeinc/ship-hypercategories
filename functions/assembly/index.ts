import { JSON } from "json-as";
import { inference } from "@hypermode/functions-as";
import { addGame, addResponse} from "./db";
import { saveHypermodeReponses, evaluatePlayerResponses,evaluatePlayerResponsesLocal, evaluateSimilarResponseForCategory} from "./player";
import { getGameInfo, GameInfo} from "./db";
export { getGameInfo, getCurrentGameInfo} from "./db";
export {isEnglishWord} from "./word";
const ENTAILMENT_THRESHOLD = 0.2;

@json
class Game {
   gameID: string="1";
   letter: string="A";
   categories: string[] | null = null; 
}
@json
class ResponseScore {
  word: string = "";
  evaluation: string = "";
  isValid: bool = true;
  entailment: f32 = 0;
  similarResponses: u16 = 0;
  score: f32 = 0;
}

@json
class PlayerInfo {
  name: string = "";
  responses: ResponseScore[] =[];
  score: f32 = 0;
  createdAt: string = "";
}

@json
class Leaderboard {
   game: Game | null = null;
   players: PlayerInfo[] = [];
}

export function startGame(): Game {
  const letter = getRandomLetter();
  const categories = getRandonCategories();
  const categoriesString = categories.join(", ");
  const gameID = addGame(letter,categoriesString );
  saveHypermodeReponses("HypermodeInternal",gameID,letter,categoriesString)
  
  return <Game>{
    gameID: gameID,
    letter: letter,
    categories: categories,
  };
}

export function simulatePlayer(gameID: string, player: string): GameInfo {
  const gameInfo = getGameInfo(gameID);
  saveHypermodeReponses(player,gameID,gameInfo.letter, gameInfo.categories)
  return gameInfo;
}
export function submit(gameID: string, player: string, responses: string): string {
  const responseArray = responses.split(",");
  const rs = responseArray.map<string>((response) => response.trim().toLowerCase());   
  const gameInfo = getGameInfo(gameID);
  const evalutaion = evaluatePlayerResponses(gameInfo.letter, gameInfo.categories, responseArray);
  const response = addResponse(player, gameID, rs, evalutaion.entailment, evalutaion.isValidLetter, evalutaion.inDictionary);
  return response;
}
export function submitResponse(gameID: string, player: string, responses: string[]): string {
  const rs = responses.map<string>((response) => response.trim().toLowerCase());   
  const gameInfo = getGameInfo(gameID);
  const evalutaion = evaluatePlayerResponses(gameInfo.letter, gameInfo.categories, responses);
  const response = addResponse(player, gameID, rs, evalutaion.entailment, evalutaion.isValidLetter, evalutaion.inDictionary);
  return response;
}

export function leaderboard(gameID: string): Leaderboard {
  const gameInfo = getGameInfo(gameID);
  console.log(JSON.stringify(gameInfo))
  const leaderboard = new Leaderboard();
  // evaluate all responses
  // score 0  for not starting with the letter
  // score 0  for being too close to another reponse (other users)
  // else score = entailment score with the category
  // final score = sum of all scores
  // emtailment score is already computed when user submit response
  const categories = gameInfo.categories.split(",")
  leaderboard.game = <Game>{
    gameID: gameInfo.gameID,
    letter: gameInfo.letter,
    categories: categories
  }
  leaderboard.players = new Array<PlayerInfo>(gameInfo.playerResponses.length)
  
  for (let i = 0; i < gameInfo.playerResponses.length; i++) {
    const entailmentList = gameInfo.playerResponses[i].entailment.split(",")
    const isValidLetterList = gameInfo.playerResponses[i].letterValidity.split(",")
    const inDictionaryList = gameInfo.playerResponses[i].dictionaryValidity.split(",")
    let resp = gameInfo.playerResponses[i].responses.split(",").map<ResponseScore>((x,index) => { 
      return <ResponseScore>{ 
        word: x
      }});
    
    for (var j = 0; j < entailmentList.length; j++) {
      resp[j].isValid = isValidLetterList[j] == "true" && inDictionaryList[j] == "true";
      resp[j].entailment = <f32>parseFloat(entailmentList[j]);
    }
    const playerInfo = <PlayerInfo>{ 
      name: gameInfo.playerResponses[i].user, 
      responses: resp, 
      score: 0,
      createdAt: gameInfo.playerResponses[i].createdAt
    }
    leaderboard.players[i] = playerInfo;
  } 

  for (let i = 0; i < categories.length; i++) {  
    // check similar responses among players
    let responsesForCategory = new Array<string>(gameInfo.playerResponses.length); 
    for (let j = 0; j < gameInfo.playerResponses.length; j++) {
      responsesForCategory[j] = gameInfo.playerResponses[j].responses.split(",")[i];
    }
    const similarity = evaluateSimilarResponseForCategory(responsesForCategory)
    for (let j = 0; j < similarity.length; j++) {
      leaderboard.players[j].responses[i].similarResponses = similarity[j];
    }
  }
  // compute final score
  for (let i = 0; i < leaderboard.players.length; i++) {   
    let playerScore = <f32>0.0 
    for (let j = 0; j < leaderboard.players[i].responses.length; j++) {
      const resp = leaderboard.players[i].responses[j];
      if ((resp.isValid) && (resp.entailment > ENTAILMENT_THRESHOLD)){
        //resp.score = resp.entailment / (resp.similarResponses + 1);
        resp.score = 1.0 / (resp.similarResponses + 1);
        playerScore += resp.score;
      } else {
        resp.score = 0;
      }
    }
    leaderboard.players[i].score = <f32>Math.round(playerScore * 100) / 100.0;
  }
  leaderboard.players.sort((a,b) => {
    const dateorder = (b.createdAt < a.createdAt ? 1 : -1);
    if (b.score == a.score) {
      return dateorder;
    } else { 
      return  (b.score > a.score  ? 1 : -1)
    }
  });
  
  return leaderboard;
}

export function test(text:string, labels: string[]): Map<string, Map<string,f32>> {
  

  let mapHypothesis = new Map<string, string>();
  for (let i = 0; i < labels.length; i++) {
    mapHypothesis.set(labels[i],`${text}. 
    This sample is about ${labels[i]}`);
  }
  const test = inference.getClassificationLabelsForTexts("smallentailment", mapHypothesis);

  return test
}

export function entails(text:string): f32 {

  const test = inference.getClassificationLabelsForText("smallentailment", text);
  return test.get("entailment")
}

function getRandomLetter(): string {
  /* following string created by openai asking
  create a string containing all letters of the alphabet at least once and  in which each letter appears with the probability of a letter being the first letter of an English word.
  */

  const alpha = "TTTTTTTTTTTTTTTTAAAAAAAABBBBBCCCCDDDEFFFGGHHHHHHHIIIIIIJKLMNNNOOPPPPQRSSSSSSSUUVWXYZ";
  const index = <i32>Math.floor(Math.random() *  alpha.length);

  return alpha.at(index);
}

function getRandonCategories(): string[] {
  var categories = [
    "A thing to do in summer",
    "Flower",
    "Fruit",
    "Vegetable",
    "Occupation",
    "Sports",
    "Found in a kitchen",
    "Animal",
    "Drink",
    "Mode of transportation",
    "Clothing",
    "Found in a classroom",
    "Furniture",
    "Hobby",
    "A dessert",
    "A types of dance",
    "Bird",
    "Found in an office",
    "Found in bathroom",
    "Insect",
    "Types of fish",
    "A thing in the living room",
    "Found in a garage",
    "Cake",
    "A thing you wear",
    "Found at the beach",
    "In the sky",
    "Tree",
    "In a garden",
    "Found in a hospital",
    "Jewelry",
    "Found in a park",
    "Mammal",
    "Seen in a zoo",
    "A type of berry"
]
  var list: string[] = [];
  for (var i =0; i < 5; i++) {
    const index = <i32>Math.floor(Math.random() *  categories.length);
    list.push(categories[index]);
    categories.splice(index, 1); 
  }
  return list;
}
