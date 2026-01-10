"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark" | "police";

interface ThemeProviderProps {
    children: React.ReactNode;
    defaultTheme?: Theme;
    storageKey?: string;
}

interface ThemeProviderState {
    theme: Theme;
    setTheme: (theme: Theme) => void;
}

const initialState: ThemeProviderState = {
    theme: "light",
    setTheme: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({
    children,
    defaultTheme = "light",
    storageKey = "pmd-ui-theme",
}: ThemeProviderProps) {
    const [theme, setTheme] = useState<Theme>(defaultTheme);

    useEffect(() => {
        // Check local storage or system preference on mount if needed
        // For now, simpler to just check storage
        const savedTheme = localStorage.getItem(storageKey) as Theme;
        if (savedTheme) {
            setTheme(savedTheme);
        }
    }, [storageKey]);

    useEffect(() => {
        const root = window.document.documentElement;

        // Remove old theme attributes if any (though we overwrite attribute so maybe not needed)
        // Actually, we use data-theme attribute
        root.setAttribute("data-theme", theme);

        // Also toggle a class for Tailwind 'dark' mode if we want to use class strategy alongside
        // usually tailwind dark mode uses 'dark' class. 
        // If theme is dark or police, we might consider it 'dark' mode for tailwind utilities?
        if (theme === "dark" || theme === "police") {
            root.classList.add("dark");
        } else {
            root.classList.remove("dark");
        }

        localStorage.setItem(storageKey, theme);
    }, [theme, storageKey]);

    const value = {
        theme,
        setTheme: (theme: Theme) => {
            setTheme(theme);
        },
    };

    return (
        <ThemeProviderContext.Provider value={value}>
            {children}
        </ThemeProviderContext.Provider>
    );
}

export const useTheme = () => {
    const context = useContext(ThemeProviderContext);

    if (context === undefined)
        throw new Error("useTheme must be used within a ThemeProvider");

    return context;
};
