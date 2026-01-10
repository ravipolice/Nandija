"use client";

import { useTheme } from "@/components/providers/ThemeProvider";
import { Moon, Sun, Shield } from "lucide-react";

export function ThemeSwitcher() {
    const { theme, setTheme } = useTheme();

    return (
        <div className="flex items-center space-x-2 bg-secondary/50 p-1.5 rounded-full border border-border">
            <button
                onClick={() => setTheme("light")}
                className={`p-1.5 rounded-full transition-all ${theme === "light"
                        ? "bg-background text-primary shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                title="Light Theme"
            >
                <Sun className="h-4 w-4" />
            </button>
            <button
                onClick={() => setTheme("dark")}
                className={`p-1.5 rounded-full transition-all ${theme === "dark"
                        ? "bg-background text-primary shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                title="Dark Theme"
            >
                <Moon className="h-4 w-4" />
            </button>
            <button
                onClick={() => setTheme("police")}
                className={`p-1.5 rounded-full transition-all ${theme === "police"
                        ? "bg-background text-primary shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                title="Police Theme"
            >
                <Shield className="h-4 w-4" />
            </button>
        </div>
    );
}
