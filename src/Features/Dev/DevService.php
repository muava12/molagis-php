<?php
declare(strict_types=1);

namespace Molagis\Features\Dev;

use Molagis\Shared\SupabaseClient;

class DevService
{
    public function __construct(
        private SupabaseClient $supabaseClient
    ) {}

    public function getOrphanOrders()
    {
        return $this->supabaseClient->rpc('get_orphan_orders', []);
    }

    public function deleteOrderPermanently(int $orderId)
    {
        $endpoint = "/rest/v1/orders?id=eq.{$orderId}";
        return $this->supabaseClient->delete($endpoint);
    }
} 