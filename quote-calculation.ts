
import { calculateDistance } from './fixed-distance-calculator';
import { type VanSize, type FloorAccess } from '../../shared/schema';

export class QuoteCalculationService {
  static async calculatePrice(params: {
    distance: number;
    vanSize: VanSize;
    helpers: number;
  }) {
    const baseRate = 40;
    const perMileRate = 2.5;
    const basePrice = baseRate + (params.distance * perMileRate);

    // Apply van size multiplier
    const vanMultipliers = {
      small: 1,
      medium: 1.2,
      large: 1.5,
      luton: 1.8
    };

    const finalPrice = basePrice * vanMultipliers[params.vanSize];
    const helperCost = params.helpers * 25; // £25 per helper

    return {
      basePrice,
      finalPrice: finalPrice + helperCost,
      breakdown: {
        baseRate,
        mileageCharge: params.distance * perMileRate,
        vanSizeMultiplier: vanMultipliers[params.vanSize],
        helperCost
      }
    };
  }
}
