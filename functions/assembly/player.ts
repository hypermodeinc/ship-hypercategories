import { addResponse } from "./db"
import { inference } from "@hypermode/functions-as"
import {dotProduct} from "./vector"
import { isEnglishWord } from "./word"

export function saveHypermodeReponses(playerName:string,gameID: string, letter: string, categories: string): void {
    const responses = generateHypermodeResponses(letter, categories).split(",")
    const cleanResponses = responses.map<string>((response) => response.trim().toLowerCase())
    const evaluation = evaluatePlayerResponses(letter, categories, cleanResponses)
    addResponse(playerName, gameID, cleanResponses, evaluation.entailment, evaluation.isValidLetter,evaluation.inDictionary )
}

function generateHypermodeResponses(letter: string, categories: string): string {
    const count = categories.split(",").length
    const prompt = `Provide ${count} words starting by the letter ${letter} for the following categories :
    "${categories}".
    Respond with one word per category, separated by a comma.`
    console.log("Prompt: "+ prompt)
    const responses = inference.generateText("openai","",prompt)
    return responses
}
class Evaluation {
    entailment: f32[] = []
    isValidLetter: boolean[] = []
    inDictionary: boolean[] = []   
}
export function evaluatePlayerResponses(letter: string, categories: string, responses: string[]): Evaluation {
    // evaluate entailemnt
    const categoryList = categories.split(",")
    const size = categoryList.length
    let entailment: f32[] = new Array<f32>(size).fill(0.0)
    let isValidLetter: boolean[] = new Array<boolean>(size).fill(false)
    let inDictionary: boolean[] = new Array<boolean>(size).fill(false)
    for (let i=0; i<categoryList.length; i++) {
        const category = categoryList[i]
        if (i <= responses.length) {
            const response = responses[i].trim().toLowerCase()
            if (response.startsWith(letter.toLowerCase())) {
                isValidLetter[i] = true
                console.log(`${response} starts with ${letter}`)
                if (response.length > 1) {
                    if (isEnglishWord(response) == true) {
                        console.log(`${response} is an English word`)
                        inDictionary[i] = true
                        const hypothesis = `${response} <sep> ${category}`
                        const test = inference.getClassificationLabelsForText("smallentailment", hypothesis);
                        console.log(`${response} entailment: ${test.get("entailment")}`)
                        entailment[i] = test.get("entailment")
                    }
                }
            }
        }
    }
     
    return {entailment, isValidLetter, inDictionary}

}


export function evaluatePlayerResponsesLocal(letter: string, categories: string, responses: string[]): Evaluation {
    // TODO: Implement a function that evaluates the responses and returns a string with the entailment
    const categoryList = categories.split(",")
    var entailment: f32[] = []
    let isValidLetter: boolean[] = []
    let inDictionary: boolean[] = []
    for (let i=0; i<categoryList.length; i++) {
        entailment.push(<f32>Math.random())
        isValidLetter.push(true)
        inDictionary.push(true)
    }
     
    return {entailment, isValidLetter, inDictionary}

}
const SIMILARITY_THRESHOLD = 0.85
export function evaluateSimilarResponseForCategory( responses: string[]): u16[] {
    // for each response evaluate if the response is similar to another response
    // compute the embeddings for each response
    var match = new Array<u16>(responses.length).fill(0)
    const count = responses.length
    let responseMap = new Map<string, string>()
    for (let i=0; i<count; i++) {
        responseMap.set(i.toString(), responses[i])
    }
    const embeddings = inference.getTextEmbeddings("minilml6v2" , responseMap)
    for (let i=0; i<count; i++) {
        const v1 = embeddings.get(i.toString())
        for (let j=i+1; j<count; j++) {
            const v2 = embeddings.get(j.toString())
            const similarity = dotProduct(v1,v2)
            // console.log(`Similarity between ${responses[i]} and ${responses[j]}: ${similarity}`)
            if (similarity > SIMILARITY_THRESHOLD ) { // found similar responses = score 0
                match[i] +=1
                match[j] +=1
            }              
             
        }
    }
    
    return match
}
