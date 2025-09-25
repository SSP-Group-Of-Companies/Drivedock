import { IDriveTestDoc } from "@/types/driveTest.types";
import { models, model, Model } from "mongoose";
import driveTestSchema from "../schemas/driveTestSchema";

const DriveTest: Model<IDriveTestDoc> = models.DriveTest || model<IDriveTestDoc>("DriveTest", driveTestSchema);

export default DriveTest;
