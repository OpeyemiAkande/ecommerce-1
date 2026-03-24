import {Show, SignInButton, SignUpButton, UserButton} from "@clerk/react";

function App() {
  return (
    <div>
      <h1>HOME PAGE</h1>
      <Show when="signed-out">
        <SignInButton />
        <SignUpButton />
      </Show>
      <Show when="signed-in">
        <UserButton />
      </Show>
    </div>
  );
}

export default App;
