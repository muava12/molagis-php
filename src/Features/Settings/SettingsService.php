<?php
declare(strict_types=1);

namespace Molagis\Features\Settings;

use Molagis\Shared\SupabaseClient;

class SettingsService
{
    private SupabaseClient $supabaseClient;

    public function __construct(SupabaseClient $supabaseClient)
    {
        $this->supabaseClient = $supabaseClient;
    }

    public function getSettings(?string $accessToken = null): array
    {
        return $this->supabaseClient->get('/rest/v1/settings?select=key,value', [], $accessToken);
    }

    public function getSettingByKey(string $key, ?string $accessToken = null): array
    {
        $response = $this->supabaseClient->get(
            "/rest/v1/settings?key=eq.{$key}&select=value",
            [],
            $accessToken
        );

        if ($response['error']) {
            return ['data' => null, 'error' => $response['error']];
        }

        return [
            'data' => $response['data'][0]['value'] ?? null,
            'error' => null
        ];
    }

    public function updateSetting(string $key, string $value, ?string $accessToken = null): array
    {
        $existing = $this->getSettingByKey($key, $accessToken);
        if ($existing['data'] !== null) {
            return $this->supabaseClient->update(
                "/rest/v1/settings?key=eq.{$key}",
                ['value' => $value],
                [],
                $accessToken
            );
        }

        return $this->supabaseClient->post(
            '/rest/v1/settings',
            ['key' => $key, 'value' => $value],
            [],
            $accessToken
        );
    }

    public function getActiveCouriers(?string $accessToken = null): array
    {
        return $this->supabaseClient->get('/rest/v1/couriers?select=id,nama,color&aktif=eq.true', [], $accessToken);
    }
}