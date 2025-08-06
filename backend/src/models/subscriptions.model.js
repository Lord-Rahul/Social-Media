import mongoose from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const subscriptionSchema = new mongoose.Schema(
  {
    subscriber: {
      type: mongoose.Schema.Types.ObjectId, //one who is subscribing
      ref: "User",
    },
    channel: {
      type: mongoose.Schema.Types.ObjectId, //one whom subscriber is subscribing
      ref: "User",
    },
  },
  { timestamps: true }
);

subscriptionSchema.plugin(mongooseAggregatePaginate);

export const Subscription = mongoose.model("Subscription", subscriptionSchema);
