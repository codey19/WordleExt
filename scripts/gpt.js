const API_KEY = ""  ;
const apiUrl = 'https://api.openai.com/v1/chat/completions';
export const askGPT = async(inputText) => {
  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        "model": "gpt-3.5-turbo",
        "messages": [{
            "role": "system",
            "content": "You are ChatGPT, a helpful assistant."
        }, {
            "role": "user",
            "content": inputText
        }]
      })
    });
    const responseData = await response.json();
    console.log(responseData.choices[0].message.content);
    return responseData.choices[0].message.content;
  } catch (error) {
    console.error(error);
  }
}