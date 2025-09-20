import { IStorage } from "../../routes";

export class PricingService {
  constructor(private storage: IStorage) {}

  async quoteFare(tripId: string, originSeq: number, destinationSeq: number, seatClass?: string): Promise<{
    total: number;
    perPassenger: number;
    breakdown: any;
  }> {
    // Get trip legs for the journey
    const legs = await this.storage.getTripLegs(tripId);
    const journeyLegs = legs.filter(leg => 
      leg.legIndex >= originSeq && leg.legIndex < destinationSeq
    );

    // Simple base pricing: 25,000 IDR per leg
    const basePricePerLeg = 25000;
    const totalBase = journeyLegs.length * basePricePerLeg;

    // Apply any price rules (simplified)
    const priceRules = await this.storage.getPriceRules();
    let totalAmount = totalBase;
    
    // Apply pattern-level rules
    const trip = await this.storage.getTripById(tripId);
    const patternRules = priceRules.filter(rule => 
      rule.scope === 'pattern' && rule.patternId === trip?.patternId
    );

    for (const rule of patternRules) {
      const ruleData = rule.rule as any;
      if (ruleData.multiplier) {
        totalAmount *= ruleData.multiplier;
      }
      if (ruleData.discount) {
        totalAmount -= ruleData.discount;
      }
    }

    return {
      total: Math.round(totalAmount),
      perPassenger: Math.round(totalAmount),
      breakdown: {
        base: totalBase,
        legs: journeyLegs.length,
        pricePerLeg: basePricePerLeg,
        rulesApplied: patternRules.length
      }
    };
  }
}
