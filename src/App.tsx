import { useEffect } from "react";
import { Chat } from "./pages/Chat.tsx";

export default function App() {
  useEffect(() => {
    const embedded = new URLSearchParams(window.location.search).get("embed") === "1";
    document.documentElement.classList.toggle("is-embed", embedded);
  }, []);

  return <Chat />;
}
