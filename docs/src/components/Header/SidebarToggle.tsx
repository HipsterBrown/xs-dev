import { type Component, createSignal, createEffect } from 'solid-js';

const MenuToggle: Component = () => {
  const [sidebarShown, setSidebarShown] = createSignal(false);

  createEffect(() => {
    const [body] = document.getElementsByTagName('body');
    const showSidebar = sidebarShown();
    if (showSidebar) {
      body.classList.add('mobile-sidebar-toggle');
    } else {
      body.classList.remove('mobile-sidebar-toggle');
    }
  });

  return (
    <button
      type="button"
      aria-pressed={sidebarShown() ? 'true' : 'false'}
      id="menu-toggle"
      onClick={() => setSidebarShown(current => !current)}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="1em"
        height="1em"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M4 6h16M4 12h16M4 18h16"
        />
      </svg>
      <span class="sr-only">Toggle sidebar</span>
    </button>
  );
};

export default MenuToggle;
