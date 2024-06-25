import {  http} from "@hypermode/functions-as";
import { JSON } from "json-as";


export function isEnglishWord(input: string) : boolean {
  // get first word
  const word = input.split(" ")[0].trim()
  const url = "https://api.dictionaryapi.dev/api/v2/entries/en/" + word
  
  const request = new http.Request(url,{
    method: "GET"
  } as http.RequestOptions);

  const response = http.fetch(request);
  
  const isValid = ! response.text().toLowerCase().includes("no definitions found")
 
  return  isValid
}
