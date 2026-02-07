import { protectedRoutes } from "./routes.config";

export const searchableIndex = protectedRoutes.map(route => ({
    ...route,
    searchBlob: `${route.title} ${route.description} ${route.key}`.toLowerCase()
}));
