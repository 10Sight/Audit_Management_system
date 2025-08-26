export const UserRolesEnum = {
    ADMIN: "ADMIN",
    MANAGER: "MANAGER",
    EMPLOYEE: "EMPLOYEE",
};

export const AvailableUserRoles = Object.values(UserRolesEnum);

export const UserStatusEnum = {
    ACTIVE: "ACTIVE",
    SUSPENDED: "SUSPENDED",
    PENDING: "PENDING",
    BANNED: "BANNED",
};

export const AvailableUserStatus = Object.values(UserStatusEnum);