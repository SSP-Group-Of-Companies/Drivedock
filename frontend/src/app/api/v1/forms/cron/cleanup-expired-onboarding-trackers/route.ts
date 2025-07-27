import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/utils/connectDB";
import OnboardingTracker from "@/mongoose/models/OnboardingTracker";

const CRON_SECRET = process.env.CRON_SECRET;

export const GET = async (req: NextRequest) => {
  // Check auth token from query param
  const token = req.nextUrl.searchParams.get("auth");

  if (!token || token !== CRON_SECRET) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    await connectDB();

    const now = Date.now();

    // Find expired and incomplete trackers
    const expired = await OnboardingTracker.find({
      resumeExpiresAt: { $lt: now },
      "status.completed": false,
    });

    let deletedCount = 0;

    for (const tracker of expired) {
      await OnboardingTracker.findByIdAndDelete(tracker._id); // Triggers post-delete
      deletedCount++;
    }

    return NextResponse.json({
      success: true,
      message: `Deleted ${deletedCount} expired onboarding trackers.`,
    });
  } catch (err) {
    console.error("[CRON CLEANUP ERROR]:", err);
    return NextResponse.json(
      {
        success: false,
        message: "Cleanup failed",
        error: (err as Error).message,
      },
      { status: 500 }
    );
  }
};
