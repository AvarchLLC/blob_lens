'use client';
import React from 'react';

export function useScroll(threshold: number) {
    const [scrolled, setScrolled] = React.useState(false);

    const onScroll = React.useCallback(() => {
        setScrolled(window.scrollY > threshold);
    }, [threshold]);

    React.useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > threshold);
        };

        const frameId = requestAnimationFrame(handleScroll);
        window.addEventListener('scroll', handleScroll, { passive: true });

        return () => {
            cancelAnimationFrame(frameId);
            window.removeEventListener('scroll', handleScroll);
        };
    }, [threshold]);

    return scrolled;
}
