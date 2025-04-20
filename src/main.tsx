import { Container, LocalStorage, Text, Theme, ThemeContext } from "./ui";
import { render } from "preact";
import { useState } from "preact/hooks";
import { Editor } from "./editor";
import "preact/devtools";
import { Story, StoryParagraph } from "./story";


function App({theme: initialTheme}: {theme: Theme}) {
  const [theme, setTheme] = useState(initialTheme);

  return <ThemeContext.Provider value={{theme, setTheme}} ><Container className="flex flex-row justify-center py-10 gap-5 px-10" >
    {/* <div className="flex flex-col" >
      <Text v="bold" >Table of Contents</Text>
      
    </div> */}
   
    <Editor />
    {/* <Story stage={{
      type: "story",
      name: "abc",
      para: [
        <StoryParagraph key={0} end={{
          type: "choice",
          key: "mychoice",
          choices: [
            { value: "hi", label: "bc" }
          ]
        }} >
          {"hi there abc".repeat(5)}
        </StoryParagraph>,
        <StoryParagraph key={0} >
          hi there abc def
        </StoryParagraph>
      ]
    }} /> */}
  </Container></ThemeContext.Provider>;
}

document.addEventListener("DOMContentLoaded", ()=>{
	const initialTheme = LocalStorage.theme
		?? "dark";//(window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");

	render(<App theme={initialTheme} />, document.body);
});
