import { levels } from "./levels";

export const defaultSettings = {
    privacy: {
        showOnlineStatus: true,
        showCurrentCourse: true,
        showInRanking: true,
        showStreak: true,
        allowFriendRequests: true,
    },
    preferences: {
        dailyGoalXp: levels.defaultDailyGoalXp as number,
        soundEffects: true,
        reduceMotion: false,
    },
    notifications: {
        dailyReminder: true,
        achievements: true,
        friendActivity: true,
    },
};