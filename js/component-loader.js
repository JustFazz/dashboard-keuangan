export async function loadComponents() {
    const components = [
        { selector: "#lock-screen-slot", file: "./components/lock-screen.html" },
        { selector: "#header-slot", file: "./components/header.html" },
        { selector: "#input-page-slot", file: "./components/input-page.html" },
        { selector: "#riwayat-page-slot", file: "./components/riwayat-page.html" },
        { selector: "#modals-slot", file: "./components/modals.html" },
    ];

    await Promise.all(
        components.map(async (item) => {
            const container = document.querySelector(item.selector);
            if (container) {
                const response = await fetch(item.file);
                const html = await response.text();
                container.outerHTML = html;
            }
        })
    );
}
