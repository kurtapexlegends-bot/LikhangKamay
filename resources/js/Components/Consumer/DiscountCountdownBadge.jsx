import React, { useState, useEffect } from "react";
import { Clock } from "lucide-react";

export default function DiscountCountdownBadge({ endAt, compact = false }) {
    const [timeLeft, setTimeLeft] = useState(null);

    useEffect(() => {
        if (!endAt) return;

        const calculateTimeLeft = () => {
            const difference = new Date(endAt).getTime() - new Date().getTime();
            if (difference <= 0) {
                return null;
            }

            const days = Math.floor(difference / (1000 * 60 * 60 * 24));
            const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
            const minutes = Math.floor((difference / 1000 / 60) % 60);
            const seconds = Math.floor((difference / 1000) % 60);

            return { days, hours, minutes, seconds, totalMs: difference };
        };

        setTimeLeft(calculateTimeLeft());
        const timer = setInterval(() => {
            setTimeLeft(calculateTimeLeft());
        }, 1000);

        return () => clearInterval(timer);
    }, [endAt]);

    if (!timeLeft) {
        return null;
    }

    let label = "";
    if (compact) {
        if (timeLeft.days > 2) {
            label = `${timeLeft.days}d left`;
        } else if (timeLeft.days > 0) {
            label = `${timeLeft.days}d ${timeLeft.hours}h left`;
        } else {
            const pad = (n) => String(n).padStart(2, "0");
            label = `${pad(timeLeft.hours)}:${pad(timeLeft.minutes)}:${pad(timeLeft.seconds)}`;
        }
    } else {
        if (timeLeft.days > 2) {
            label = `Ends in ${timeLeft.days} days`;
        } else if (timeLeft.days > 0) {
            label = `Ends in ${timeLeft.days}d ${timeLeft.hours}h`;
        } else {
            const pad = (n) => String(n).padStart(2, "0");
            label = `Ends in ${pad(timeLeft.hours)}:${pad(timeLeft.minutes)}:${pad(timeLeft.seconds)}`;
        }
    }

    const isUrgent = timeLeft.days === 0;

    return (
        <span className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow-sm transition-all whitespace-nowrap ${
            isUrgent 
                ? "bg-rose-600 text-white animate-pulse" 
                : "bg-amber-100/90 text-amber-900 border border-amber-200/80 backdrop-blur-xs"
        }`}>
            <Clock size={11} className={isUrgent ? "text-white" : "text-amber-700"} />
            <span>{label}</span>
        </span>
    );
}
