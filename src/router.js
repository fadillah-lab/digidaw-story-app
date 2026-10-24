import { renderLogin } from "./pages/login.js";
import { renderRegister } from "./pages/register.js";
import { renderStories } from "./pages/stories.js";
import { renderAddStory } from "./pages/add-story.js";
import { renderSavedStories } from "./pages/saved-stories.js";

const routes = {
  "/login": renderLogin,
  "/register": renderRegister,
  "/stories": renderStories,
  "/add-story": renderAddStory,
  "/saved-stories": renderSavedStories,
};

export function navigate(path) {
  location.hash = `#${path}`;
}

export function startRouter() {
  const renderRoute = () => {
    const path = location.hash.slice(1).split("?")[0] || "/stories";
    const render = routes[path] || renderStories;
    const app = document.querySelector("#app");
    const update = () => {
      app.replaceChildren();
      render(app);
      window.scrollTo(0, 0);
    };
    if (document.startViewTransition) document.startViewTransition(update);
    else update();
    document.querySelector("[data-auth-link]").hidden =
      !localStorage.getItem("story-token");
    document.querySelector("[data-guest-link]").hidden = Boolean(
      localStorage.getItem("story-token"),
    );
    document.querySelector("[data-logout]").hidden =
      !localStorage.getItem("story-token");
  };
  window.addEventListener("hashchange", renderRoute);
  renderRoute();
}
