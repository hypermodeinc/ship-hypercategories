
import { JSON } from "json-as";
import {  connection, QueryVariables} from "@hypermode/functions-as";


const DGRAPH_HOST = "dgraph-hypermode"

@json
export class Game {
   gameID: string="1";
   letter: string="A";
   categories: string[] | null = null; 
}

@json
class IdData {
    id!: string
}
@json
class UidsData {
    ids!: IdData[]
}
@json
class MutationResult {
  op!: UidsData
}

@json
class numUidsData {
  numUids!: number
}
@json
class MutationResultNumUids {
  op!: numUidsData
}




export function addGame(letter: string, categories: string): string {
  const now = new Date(Date.now()).toISOString()
  const statement = `mutation AddGame($letter: String! , $categories: String!) {
        op:addGame(
            input: { createdAt: "${now}", letter: $letter, categories: $categories }
        ) {
            ids:game {
                id
            }
        }
    }`
  const vars = new QueryVariables();
  vars.set("letter", letter);
  vars.set("categories", categories);

  const result = connection.invokeGraphqlApi<MutationResult>(DGRAPH_HOST,statement,vars);
  if (result.data == null) {
    throw new Error("addQuestion failed")
  } else {
    const gameID = (<MutationResult>result.data).op.ids[0].id  
    return gameID
  }
}

export function addResponse(player: string, game:string, responses: string[], entailment: f32[], isValidLetter: boolean[], isInDictionary: boolean[]): string {
    console.log(`addResponse: ${player} ${game} ${responses} `)
    const now = new Date(Date.now()).toISOString()
    const statement = `mutation AddPlayerResponse($xid: String!, $user: String! , $game: ID!, $responses: String!, $entailment: String!, $isValidLetter: String!, $isInDictionary: String!) {
        op:addPlayerResponse(
                input: { 
                  xid: $xid, 
                  createdAt: "${now}",
                  user: $user, 
                  responses: $responses, 
                  entailment:$entailment, 
                  letterValidity: $isValidLetter,
                  dictionaryValidity: $isInDictionary,
                  game: { id: $game}}, upsert: true 
            ) {
                numUids
            }
        }
        `
    const vars = new QueryVariables();
    const xid = `${game}-${player}`
    vars.set("xid", xid);
    vars.set("user", player);
    vars.set("responses", responses.join(","));
    vars.set("entailment", entailment.join(","));
    vars.set("isValidLetter", isValidLetter.join(","));
    vars.set("isInDictionary", isInDictionary.join(","));
    vars.set("game", game);
  
    const result = connection.invokeGraphqlApi<MutationResultNumUids>(DGRAPH_HOST,statement,vars);
    if (result.data == null) {
      throw new Error("addQuestion failed")
    } 
    
    return "success"
    
}


@json 
class GetGame {
    game: GameInfo = new GameInfo();
}
@json 
class QueryGame {
    game: GameInfo[] = []
}
@json 
class Count {
    count: number = 0
}
@json
export class GameInfo {
   gameID: string="1"
   letter: string="A"
   categories: string=""
   playerResponses: PlayerResponse[] = []
   responseCount: Count = new Count()
}
@json 
class PlayerResponse {
    user: string = "";
    createdAt: string = "";
    responses: string = "";
    entailment: string = "";
    letterValidity: string = "";
    dictionaryValidity: string = "";
}

export function getGameInfo(game:string): GameInfo {
    console.log(`getGameInfo: ${game}`)
    const statement = `query GetGame($id: ID!) {
        game:getGame(id: $id) {
            gameID:id
            letter
            categories
            playerResponses {
                user
                createdAt
                responses
                entailment
                letterValidity
                dictionaryValidity
            }
            responseCount:playerResponsesAggregate {
                count
            }
        }
    }`
    const vars = new QueryVariables();
    vars.set("id", game);

    const result = connection.invokeGraphqlApi<GetGame>(DGRAPH_HOST,statement,vars);
    if (result.data == null) {
      const errors = result.errors
      if (errors != null) {
        throw new Error(errors[0].message)
      } else {
        throw new Error("getGame failed")
      }
    } 
    const gameInfo = (<GetGame>result.data).game
    console.log(`Game ${game} - Letter ${gameInfo.letter}`)
    console.log(`Game ${game} - Categories ${gameInfo.categories}`)
    return gameInfo
    
  }
  
  export function getCurrentGameInfo(): GameInfo {
    // retrieve the latest created game
    const statement = `query GetGame() {
        game:queryGame(order: { desc: createdAt }, first: 1) {
            gameID:id
            letter 
            categories
            playerResponses {
                user
                responses
                entailment
                letterValidity
                dictionaryValidity
            }
            responseCount:playerResponsesAggregate {
                count
            }
        }
    }`
 
    const result = connection.invokeGraphqlApi<QueryGame>(DGRAPH_HOST,statement);
    if (result.data == null) {
      const errors = result.errors
      if (errors != null) {
        throw new Error(errors[0].message)
      } else {
        throw new Error("getGame failed")
      }
    } 
    
    return (<QueryGame>result.data).game[0]
    
  }
