import { addResponse } from "./db";
import { inference } from "@hypermode/functions-as";
import { dotProduct } from "./vector";
import { isEnglishWord } from "./word";
import { Game, GameInfo } from "./db";

const ENTAILMENT_THRESHOLD = 0.2;

export function saveHypermodeResponses(
  playerName: string,
  gameID: string,
  letter: string,
  categories: string,
): void {
  const responses = generateHypermodeResponses(letter, categories).split(",");
  const cleanResponses = responses.map<string>((response) =>
    response.trim().toLowerCase(),
  );
  const evaluation = evaluatePlayerResponses(
    letter,
    categories,
    cleanResponses,
  );
  addResponse(
    playerName,
    gameID,
    cleanResponses,
    evaluation.entailment,
    evaluation.isValidLetter,
    evaluation.inDictionary,
  );
}

function generateHypermodeResponses(
  letter: string,
  categories: string,
): string {
  const count = categories.split(",").length;
  const prompt = `Provide ${count} words starting by the letter ${letter} for the following categories :
    "${categories}".
    Respond with one word per category, separated by a comma.`;
  console.log("Prompt: " + prompt);
  const responses = inference.generateText("openai", "", prompt);
  return responses;
}
class Evaluation {
  entailment: f32[] = [];
  isValidLetter: boolean[] = [];
  inDictionary: boolean[] = [];
}
export function evaluatePlayerResponses(
  letter: string,
  categories: string,
  responses: string[],
): Evaluation {
  // evaluate entailemnt
  const categoryList = categories.split(",");
  const size = categoryList.length;
  const entailment: f32[] = new Array<f32>(size).fill(0.0);
  const isValidLetter: boolean[] = new Array<boolean>(size).fill(false);
  const inDictionary: boolean[] = new Array<boolean>(size).fill(false);
  for (let i = 0; i < categoryList.length; i++) {
    const category = categoryList[i];
    if (i <= responses.length) {
      const response = responses[i].trim().toLowerCase();
      if (response.startsWith(letter.toLowerCase())) {
        isValidLetter[i] = true;
        // console.log(`${response} starts with ${letter}`)
        if (response.length > 1) {
          if (isEnglishWord(response) == true) {
            // console.log(`${response} is an English word`)
            inDictionary[i] = true;
            const hypothesis = `${response} <sep> ${category}`;
            const test = inference.getClassificationLabelsForText(
              "smallentailment",
              hypothesis,
            );
            // console.log(`${response} entailment: ${test.get("entailment")}`)
            entailment[i] = test.get("entailment");
          }
        }
      }
    }
    console.log(`Response ${responses[i]} for category ${category}`);
    console.log(
      `isValid letter: ${isValidLetter[i]}, is english word: ${inDictionary[i]}, entailment: ${entailment[i]}`,
    );
  }

  return { entailment, isValidLetter, inDictionary };
}

export function evaluatePlayerResponsesLocal(
  letter: string,
  categories: string,
): Evaluation {
  // TODO: Implement a function that evaluates the responses and returns a string with the entailment
  const categoryList = categories.split(",");
  const entailment: f32[] = [];
  const isValidLetter: boolean[] = [];
  const inDictionary: boolean[] = [];
  for (let i = 0; i < categoryList.length; i++) {
    entailment.push(<f32>Math.random());
    isValidLetter.push(true);
    inDictionary.push(true);
  }
  return { entailment, isValidLetter, inDictionary };
}

const SIMILARITY_THRESHOLD = 0.85;
export function evaluateSimilarResponseForCategory(responses: string[]): u16[] {
  // for each response evaluate if the response is similar to another response
  // compute the embeddings for each response
  const match = new Array<u16>(responses.length).fill(0);
  const count = responses.length;
  const responseMap = new Map<string, string>();
  for (let i = 0; i < count; i++) {
    responseMap.set(i.toString(), responses[i]);
  }
  const embeddings = inference.getTextEmbeddings("minilml6v2", responseMap);
  for (let i = 0; i < count; i++) {
    const v1 = embeddings.get(i.toString());
    for (let j = i + 1; j < count; j++) {
      const v2 = embeddings.get(j.toString());
      const similarity = dotProduct(v1, v2);
      // console.log(`Similarity between ${responses[i]} and ${responses[j]}: ${similarity}`)
      if (similarity > SIMILARITY_THRESHOLD) {
        // found similar responses = score 0
        match[i] += 1;
        match[j] += 1;
      }
    }
  }
  return match;
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
  responses: ResponseScore[] = [];
  score: f32 = 0;
  createdAt: string = "";
}


@json
export class Leaderboard {
  game: Game | null = null;
  players: PlayerInfo[] = [];
}

export function computeLeaderboard(gameInfo: GameInfo): Leaderboard {
  console.log(`Compute leaderboard for game ${gameInfo.gameID}`);
  const leaderboard = new Leaderboard();
  // evaluate all responses
  // score 0  for not starting with the letter
  // score 0  for being too close to another reponse (other users)
  // else score = entailment score with the category
  // final score = sum of all scores
  // emtailment score is already computed when user submit response
  const categories = gameInfo.categories.split(",");
  leaderboard.game = <Game>{
    gameID: gameInfo.gameID,
    letter: gameInfo.letter,
    categories: categories,
  };
  leaderboard.players = new Array<PlayerInfo>(gameInfo.playerResponses.length);

  for (let i = 0; i < gameInfo.playerResponses.length; i++) {
    const entailmentList = gameInfo.playerResponses[i].entailment.split(",");
    const isValidLetterList =
      gameInfo.playerResponses[i].letterValidity.split(",");
    const inDictionaryList =
      gameInfo.playerResponses[i].dictionaryValidity.split(",");
    const resp = gameInfo.playerResponses[i].responses
      .split(",")
      .map<ResponseScore>((x) => {
        return <ResponseScore>{
          word: x,
        };
      });

    for (let j = 0; j < entailmentList.length; j++) {
      resp[j].isValid =
        isValidLetterList[j] == "true" && inDictionaryList[j] == "true";
      resp[j].entailment = <f32>parseFloat(entailmentList[j]);
    }
    const playerInfo = <PlayerInfo>{
      name: gameInfo.playerResponses[i].user,
      responses: resp,
      score: 0,
      createdAt: gameInfo.playerResponses[i].createdAt,
    };
    leaderboard.players[i] = playerInfo;
  }

  for (let i = 0; i < categories.length; i++) {
    // check similar responses among players

    const responsesForCategory = new Array<string>(
      gameInfo.playerResponses.length,
    );
    for (let j = 0; j < gameInfo.playerResponses.length; j++) {
      responsesForCategory[j] =
        gameInfo.playerResponses[j].responses.split(",")[i];
    }
    const similarity = evaluateSimilarResponseForCategory(responsesForCategory);
    console.log(
      `Similar responses for category ${categories[i]} : ${similarity}`,
    );
    for (let j = 0; j < similarity.length; j++) {
      leaderboard.players[j].responses[i].similarResponses = similarity[j];
    }
  }
  // compute final score
  for (let i = 0; i < leaderboard.players.length; i++) {
    let playerScore = <f32>0.0;
    for (let j = 0; j < leaderboard.players[i].responses.length; j++) {
      const resp = leaderboard.players[i].responses[j];
      if (resp.isValid && resp.entailment > ENTAILMENT_THRESHOLD) {
        //resp.score = resp.entailment / (resp.similarResponses + 1);
        resp.score = 1.0 / (resp.similarResponses + 1);
        playerScore += resp.score;
      } else {
        resp.score = 0;
      }
    }
    leaderboard.players[i].score = <f32>Math.round(playerScore * 100) / 100.0;
  }
  leaderboard.players.sort((a, b) => {
    const dateorder = b.createdAt < a.createdAt ? 1 : -1;
    if (b.score == a.score) {
      return dateorder;
    } else {
      return b.score > a.score ? 1 : -1;
    }
  });

  return leaderboard;
}
