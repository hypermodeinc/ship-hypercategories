/* 
    utility function for vectors
*/


export function dotProduct(a: f64[], b: f64[]): f64 {
    let sum: f64 = 0;
    for (let i: i32 = 0; i < a.length; i++) {
        sum += a[i] * b[i];
    }
    return sum;
}   
