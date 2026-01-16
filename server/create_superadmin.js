
import connectDB from "./db/connectDB.js";
import Employee from "./models/auth.model.js";
import logger from "./logger/winston.logger.js";

const createSuperAdmin = async () => {
    try {
        await connectDB();

        const userData = {
            username: "sa001",
            password: "12345678",
            fullName: "Super Admin",
            emailId: "sa001@example.com", // Placeholder email
            employeeId: "SA001",
            phoneNumber: "1234567890",
            role: "superadmin"
        };

        // Check if user exists
        const existingUser = await Employee.findOne({
            $or: [{ username: userData.username }, { employeeId: userData.employeeId }]
        });

        if (existingUser) {
            console.log(`User already exists: ${existingUser.username} (${existingUser.emailId})`);
            process.exit(0);
        }

        console.log("Creating superadmin user...");
        const newUser = await Employee.create(userData);

        console.log("Superadmin created successfully!");
        console.log("Username:", newUser.username);
        console.log("Employee ID:", newUser.employeeId);
        console.log("Role:", newUser.role);

        process.exit(0);
    } catch (error) {
        console.error("Failed to create superadmin:", error);
        process.exit(1);
    }
};

createSuperAdmin();
