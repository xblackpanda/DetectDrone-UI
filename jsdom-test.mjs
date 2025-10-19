import { JSDOM } from "jsdom";

async function main() {
  try {
    const dom = await JSDOM.fromURL("http://127.0.0.1:4184", {
      runScripts: "dangerously",
      resources: "usable",
      pretendToBeVisual: true,
    });
    await new Promise((resolve) => setTimeout(resolve, 4000));
    const html = dom.window.document.documentElement.outerHTML;
    console.log(html.slice(0, 600));
  } catch (error) {
    console.error("JSDOM error", error);
  }
}

main();
