import { Game, addGame, getGameInfo, addResponse } from "./db";
import {
  Leaderboard,
  computeLeaderboard,
  saveHypermodeResponses as saveHypermodeResponses,
  evaluatePlayerResponses,
} from "./player";
import { getRandomLetter, getRandomCategories } from "./hypergories";

export { getGameInfo, getCurrentGameInfo } from "./db";

export function startGame(): Game {
  const letter = getRandomLetter();
  const categories = getRandomCategories();
  const categoriesString = categories.join(", ");
  const gameID = addGame(letter, categoriesString);
  saveHypermodeResponses("HypermodeInternal", gameID, letter, categoriesString);

  return <Game>{
    gameID: gameID,
    letter: letter,
    categories: categories,
  };
}

export function submit(
  gameID: string,
  player: string,
  responses: string,
): string {
  const responseArray = responses.split(",");
  const rs = responseArray.map<string>((response) =>
    response.trim().toLowerCase(),
  );
  const gameInfo = getGameInfo(gameID);
  console.log(`submitResponse for ${player}: ${rs}`);
  const evalutation = evaluatePlayerResponses(
    gameInfo.letter,
    gameInfo.categories,
    responseArray,
  );
  const response = addResponse(
    player,
    gameID,
    rs,
    evalutation.entailment,
    evalutation.isValidLetter,
    evalutation.inDictionary,
  );
  return response;
}

export function leaderboard(gameID: string): Leaderboard {
  const gameInfo = getGameInfo(gameID);
  const leaderboard = computeLeaderboard(gameInfo);

  return leaderboard;
}

/*

export function entails(text:string): f32 {

  const test = inference.getClassificationLabelsForText("smallentailment", text);
  return test.get("entailment")
}
*/
