import { hardwareTopics } from "./catalog.mjs";

const topic = document.getElementById("prompt-topic");
const prompt = document.getElementById("example-prompt");
const copy = document.querySelector("[data-copy]");
topic.addEventListener("change", () => {
  const selected = hardwareTopics.find((entry) => entry.id === topic.value);
  if (!selected) return;
  prompt.textContent = selected.prompt;
  copy.textContent = "Copy prompt ⧉";
});
copy.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(`@Cutaway ${prompt.textContent.trim()}`);
    copy.textContent = "Copied ✓";
  } catch {
    const range = document.createRange();
    range.selectNodeContents(prompt);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    copy.textContent = "Text selected. Press Ctrl+C or ⌘C to copy.";
  }
});
document.querySelectorAll("[data-interactive]").forEach((element) => { element.hidden = false; });
