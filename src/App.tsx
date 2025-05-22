import { Assistant } from "./Assistant";
import Todos from "./Todos";

// Placeholder component for Todos


function App() {
  return (
    // Parent container using flexbox to split the screen
    <div className="flex w-full h-screen">
      {/* Assistant takes up the left half */}
      <div className="w-1/2 h-full">
        <Assistant />
      </div>
      {/* Todos takes up the right half */}
      <Todos />
    </div>
  )
}

export default App
