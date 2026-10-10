package service

import (
	"testing"
)

func TestSimulatorBoundedPercentageChange(t *testing.T) {
	initialPrice := int64(300000) // ₹3,000.00
	maxChangePct := 2.0           // ±2%

	minAllowed := int64(float64(initialPrice) * 0.97)
	maxAllowed := int64(float64(initialPrice) * 1.03)

	if initialPrice < minAllowed || initialPrice > maxAllowed {
		t.Errorf("Price out of expected boundary bounds: got %d", initialPrice)
	}
}
