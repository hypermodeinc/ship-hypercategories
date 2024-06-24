import {  http} from "@hypermode/functions-as";
import { JSON } from "json-as";

@json 
class WordInfo {
    word: string = "";
    phonetic: string = "";
}
@json
class NotFound {
    title: string = "";
    message: string = "";
    resolution: string = "";
}
@json 
class DictionaryResponse {
    word: WordInfo | null = null;
    notFound: NotFound | null = null;
}


export function isEnglishWord(input: string) : boolean {
    // get first word
    const word = input.split(" ")[0].trim()

    const headers : Map<string, string>= new Map<string, string>()


  const url = "https://api.dictionaryapi.dev/api/v2/entries/en/" + word
  const request = new http.Request(url,{
    method: "GET"
  } as http.RequestOptions);

  const response = http.fetch(request);
  
  const isValid = ! response.text().toLowerCase().includes("no definitions found")

  const info = response.json<WordInfo[]>()
  //console.log("Phonetic: "+info[0].phonetic)
 
  return  isValid
}
