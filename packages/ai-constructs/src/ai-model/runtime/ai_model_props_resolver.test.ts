import { describe, it } from 'node:test';
import assert from 'node:assert';
import { MockAiModelPropsResolver, TEST_MODEL_IDS } from '../test-assets';

void describe('AiModelPropsResolver', () => {
  const {
    FOUNDATION,
    INF_PROFILE_US,
    INF_PROFILE_EU,
    NO_CRI_MODEL,
    UNKNOWN_MODEL,
  } = TEST_MODEL_IDS;

  const buildResolver = () => new MockAiModelPropsResolver();

  void describe('resolveModelId', () => {
    void it('returns foundation model when CRI is supported but disabled', () => {
      const resolver = buildResolver();
      const out = resolver.resolveModelId({
        modelId: FOUNDATION,
        region: 'us-west-2',
        crossRegionInference: false,
      });
      assert.strictEqual(out, FOUNDATION);
    });

    void it('returns inference profile when CRI is required in region', () => {
      const resolver = buildResolver();
      const out = resolver.resolveModelId({
        modelId: FOUNDATION,
        region: 'us-east-2',
        crossRegionInference: false,
      });
      assert.strictEqual(out, INF_PROFILE_US);
    });

    void it('returns inference profile when CRI is enabled and supported', () => {
      const resolver = buildResolver();
      const out = resolver.resolveModelId({
        modelId: FOUNDATION,
        region: 'us-west-2',
        crossRegionInference: true,
      });
      assert.strictEqual(out, INF_PROFILE_US);
    });

    void it('passes through known inference profile ids unchanged', () => {
      const resolver = buildResolver();
      const out = resolver.resolveModelId({
        modelId: INF_PROFILE_US,
        region: 'us-west-2',
        crossRegionInference: false,
      });
      assert.strictEqual(out, INF_PROFILE_US);
    });

    void it('returns foundation model when CRI not supported in geography', () => {
      const resolver = buildResolver();
      const out = resolver.resolveModelId({
        modelId: NO_CRI_MODEL,
        region: 'us-east-1',
        crossRegionInference: true,
      });
      assert.strictEqual(out, NO_CRI_MODEL);
    });

    void it('throws for unknown model id', () => {
      const resolver = buildResolver();
      assert.throws(
        () =>
          resolver.resolveModelId({
            modelId: UNKNOWN_MODEL,
            region: 'us-east-1',
            crossRegionInference: false,
          }),
        /Unknown model ID/,
      );
    });

    void it('throws for unknown region', () => {
      const resolver = buildResolver();
      assert.throws(
        () =>
          resolver.resolveModelId({
            modelId: FOUNDATION,
            region: 'invalid-region',
            crossRegionInference: false,
          }),
        /Unknown or unsupported region/,
      );
    });
  });

  void describe('getGeography', () => {
    void it('maps region geographies correctly', () => {
      const resolver = buildResolver();
      assert.strictEqual(resolver.getGeography('us-east-1'), 'us');
      assert.strictEqual(resolver.getGeography('eu-central-1'), 'eu');
      assert.strictEqual(resolver.getGeography('ap-northeast-1'), 'apac');
    });

    void it('throws for unknown region', () => {
      const resolver = buildResolver();
      assert.throws(
        () => resolver.getGeography('eu-not-a-region'),
        /Unknown or unsupported region/,
      );
      assert.throws(
        () => resolver.getGeography('invalid-region'),
        /Unknown or unsupported region/,
      );
    });

    void it('throws for empty or invalid input', () => {
      const resolver = buildResolver();
      assert.throws(
        () => resolver.getGeography(''),
        /Region parameter is required/,
      );
      assert.throws(
        () => resolver.getGeography('   '),
        /Region parameter is required/,
      );
      // @ts-expect-error - null
      assert.throws(
        () => resolver.getGeography(null),
        /Region parameter is required/,
      );
      // @ts-expect-error - undefined
      assert.throws(
        () => resolver.getGeography(undefined),
        /Region parameter is required/,
      );
    });
  });

  void describe('validateModelId', () => {
    void it('validates known foundation models', () => {
      const resolver = buildResolver();
      assert.doesNotThrow(() => resolver.validateModelId(FOUNDATION));
      assert.doesNotThrow(() => resolver.validateModelId(NO_CRI_MODEL));
    });

    void it('throws for unknown model id', () => {
      const resolver = buildResolver();
      assert.throws(
        () => resolver.validateModelId(UNKNOWN_MODEL),
        /Unknown model ID/,
      );
      assert.throws(() => resolver.validateModelId(''), /Unknown model ID/);
    });
  });

  void describe('isKnownInferenceProfile', () => {
    void it('recognizes known inference profiles', () => {
      const resolver = buildResolver();
      assert.strictEqual(
        resolver.isKnownInferenceProfile(INF_PROFILE_US),
        true,
      );
      assert.strictEqual(
        resolver.isKnownInferenceProfile(INF_PROFILE_EU),
        true,
      );
    });

    void it('returns false for foundation models', () => {
      const resolver = buildResolver();
      assert.strictEqual(resolver.isKnownInferenceProfile(FOUNDATION), false);
      assert.strictEqual(resolver.isKnownInferenceProfile(NO_CRI_MODEL), false);
    });

    void it('returns false for invalid input', () => {
      const resolver = buildResolver();
      assert.strictEqual(resolver.isKnownInferenceProfile(''), false);
      // @ts-expect-error - null
      assert.strictEqual(resolver.isKnownInferenceProfile(null), false);
      // @ts-expect-error - undefined
      assert.strictEqual(resolver.isKnownInferenceProfile(undefined), false);
      // @ts-expect-error - integer
      assert.strictEqual(resolver.isKnownInferenceProfile(123), false);
    });
  });

  void describe('getFoundationModelId', () => {
    void it('returns foundation model for known profiles', () => {
      const resolver = buildResolver();
      assert.strictEqual(
        resolver.getFoundationModelId(INF_PROFILE_US),
        FOUNDATION,
      );
      assert.strictEqual(
        resolver.getFoundationModelId(INF_PROFILE_EU),
        FOUNDATION,
      );
    });

    void it('throws for unknown inference profile', () => {
      const resolver = buildResolver();
      assert.throws(
        () => resolver.getFoundationModelId('unknown.profile.id'),
        /Unknown inference profile ID/,
      );
      assert.throws(
        () => resolver.getFoundationModelId(FOUNDATION),
        /Unknown inference profile ID/,
      );
    });

    void it('throws for empty or invalid input', () => {
      const resolver = buildResolver();
      assert.throws(
        () => resolver.getFoundationModelId(''),
        /Inference profile ID is required/,
      );
      assert.throws(
        () => resolver.getFoundationModelId('   '),
        /Inference profile ID is required/,
      );
      // @ts-expect-error - null
      assert.throws(
        () => resolver.getFoundationModelId(null),
        /Inference profile ID is required/,
      );
      // @ts-expect-error - undefined
      assert.throws(
        () => resolver.getFoundationModelId(undefined),
        /Inference profile ID is required/,
      );
    });
  });

  void describe('requiresCri', () => {
    void it('returns true when CRI is required in region', () => {
      const resolver = buildResolver();
      assert.strictEqual(resolver.requiresCri(FOUNDATION, 'us-east-2'), true);
    });

    void it('returns false when CRI is not required in region', () => {
      const resolver = buildResolver();
      assert.strictEqual(resolver.requiresCri(FOUNDATION, 'us-west-2'), false);
      assert.strictEqual(resolver.requiresCri(FOUNDATION, 'us-east-1'), false);
    });

    void it('throws for unknown model', () => {
      const resolver = buildResolver();
      assert.throws(
        () => resolver.requiresCri(UNKNOWN_MODEL, 'us-east-1'),
        /Unknown model ID/,
      );
    });

    void it('throws for unknown region', () => {
      const resolver = buildResolver();
      assert.throws(
        () => resolver.requiresCri(FOUNDATION, 'invalid-region'),
        /Unknown or unsupported region/,
      );
    });
  });

  void describe('supportsCri', () => {
    void it('returns true when CRI is supported from region', () => {
      const resolver = buildResolver();
      assert.strictEqual(resolver.supportsCri(FOUNDATION, 'us-east-1'), true);
      assert.strictEqual(resolver.supportsCri(FOUNDATION, 'us-west-2'), true);
    });

    void it('returns false when no inference profile exists', () => {
      const resolver = buildResolver();
      assert.strictEqual(
        resolver.supportsCri(NO_CRI_MODEL, 'us-east-1'),
        false,
      );
    });

    void it('returns false when region not in supportsCriFrom list', () => {
      const resolver = buildResolver();
      assert.strictEqual(resolver.supportsCri(FOUNDATION, 'us-west-1'), false);
    });

    void it('throws for unknown model', () => {
      const resolver = buildResolver();
      assert.throws(
        () => resolver.supportsCri(UNKNOWN_MODEL, 'us-east-1'),
        /Unknown model ID/,
      );
    });

    void it('throws for unknown region', () => {
      const resolver = buildResolver();
      assert.throws(
        () => resolver.supportsCri(FOUNDATION, 'invalid-region'),
        /Unknown or unsupported region/,
      );
    });
  });

  void describe('getInferenceProfileId', () => {
    void it('returns inference profile for valid model and geography', () => {
      const resolver = buildResolver();
      assert.strictEqual(
        resolver.getInferenceProfileId(FOUNDATION, 'us'),
        INF_PROFILE_US,
      );
      assert.strictEqual(
        resolver.getInferenceProfileId(FOUNDATION, 'eu'),
        INF_PROFILE_EU,
      );
    });

    void it('throws when no inference profile exists', () => {
      const resolver = buildResolver();
      assert.throws(
        () => resolver.getInferenceProfileId(NO_CRI_MODEL, 'us'),
        /No inference profile ID/,
      );
    });

    void it('throws for unknown model', () => {
      const resolver = buildResolver();
      assert.throws(
        () => resolver.getInferenceProfileId(UNKNOWN_MODEL, 'us'),
        /Unknown model ID/,
      );
    });

    void it('throws for unknown geography', () => {
      const resolver = buildResolver();
      assert.throws(
        () => resolver.getInferenceProfileId(FOUNDATION, 'invalid'),
        /No configuration for model/,
      );
    });
  });

  void describe('getSupportedSourceRegions', () => {
    void it('returns supported regions for valid model and geography', () => {
      const resolver = buildResolver();
      const regions = resolver.getSupportedSourceRegions(FOUNDATION, 'us');
      assert.deepStrictEqual(regions, ['us-east-1', 'us-west-2']);
    });

    void it('returns empty array when no CRI support', () => {
      const resolver = buildResolver();
      const regions = resolver.getSupportedSourceRegions(NO_CRI_MODEL, 'us');
      assert.deepStrictEqual(regions, []);
    });

    void it('returns different regions for different geographies', () => {
      const resolver = buildResolver();
      const usRegions = resolver.getSupportedSourceRegions(FOUNDATION, 'us');
      const euRegions = resolver.getSupportedSourceRegions(FOUNDATION, 'eu');
      assert.notDeepStrictEqual(usRegions, euRegions);
      assert.deepStrictEqual(euRegions, ['eu-west-1']);
    });

    void it('throws for unknown model', () => {
      const resolver = buildResolver();
      assert.throws(
        () => resolver.getSupportedSourceRegions(UNKNOWN_MODEL, 'us'),
        /Unknown model ID/,
      );
    });

    void it('throws for unknown geography', () => {
      const resolver = buildResolver();
      assert.throws(
        () => resolver.getSupportedSourceRegions(FOUNDATION, 'invalid'),
        /No configuration for model/,
      );
    });
  });

  void describe('getModelMapping (private method edge cases)', () => {
    void it('handles models with missing geography configurations', () => {
      const resolver = buildResolver();
      assert.throws(
        () => resolver.getSupportedSourceRegions(FOUNDATION, 'nonexistent'),
        /No configuration for model/,
      );
    });

    void it('provides helpful error messages with available geographies', () => {
      const resolver = buildResolver();
      try {
        resolver.getSupportedSourceRegions(FOUNDATION, 'invalid');
        assert.fail('Should have thrown');
      } catch (error) {
        assert.match((error as Error).message, /Available geographies: us, eu/);
      }
    });
  });

  void describe('misc. scenarios', () => {
    void it('handles model with no CRI requirement but CRI support', () => {
      const resolver = buildResolver();

      // No CRI requirement in us-east-1 and us-west-2
      assert.strictEqual(resolver.requiresCri(FOUNDATION, 'us-east-1'), false);
      assert.strictEqual(resolver.requiresCri(FOUNDATION, 'us-west-2'), false);

      // But CRI is supported
      assert.strictEqual(resolver.supportsCri(FOUNDATION, 'us-east-1'), true);

      // Should use foundation model when CRI disabled
      assert.strictEqual(
        resolver.resolveModelId({
          modelId: FOUNDATION,
          region: 'us-east-1',
          crossRegionInference: false,
        }),
        FOUNDATION,
      );

      // Should use inference profile when CRI enabled
      assert.strictEqual(
        resolver.resolveModelId({
          modelId: FOUNDATION,
          region: 'us-east-1',
          crossRegionInference: true,
        }),
        INF_PROFILE_US,
      );
    });

    void it('handles models with geography-specific availability', () => {
      const resolver = buildResolver();

      // Available in US
      assert.strictEqual(resolver.supportsCri(FOUNDATION, 'us-east-1'), true);

      // Available in EU
      assert.strictEqual(resolver.supportsCri(FOUNDATION, 'eu-west-1'), true);

      // Should return foundation model when CRI not supported in geography
      assert.strictEqual(
        resolver.resolveModelId({
          modelId: NO_CRI_MODEL,
          region: 'us-east-1',
          crossRegionInference: true,
        }),
        NO_CRI_MODEL,
      );
    });
  });
});
