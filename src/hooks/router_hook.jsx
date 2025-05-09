import { useRouter } from 'next/navigation';

export const useAppRouter = () => {
    const router = useRouter();
    const push = (href, query) => {
        if (query) {
            const urlParams = new URLSearchParams(query).toString();
            href = href.concat(`?${urlParams}`);
        }
        router.push(href);
    };
    return { ...router, push };
};