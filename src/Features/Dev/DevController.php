<?php
declare(strict_types=1);

namespace Molagis\Features\Dev;

use Psr\Http\Message\ServerRequestInterface;
use Laminas\Diactoros\Response;

class DevController
{
    public function __construct(
        private DevService $devService
    ) {}

    public function getOrphanOrdersApi(ServerRequestInterface $request): Response
    {
        $response = new Response();
        $result = $this->devService->getOrphanOrders();
        $body = (string) $result->getBody();
        $data = json_decode($body, true);

        if ($result->getStatus() >= 300) {
            $response->getBody()->write(json_encode(['message' => 'Failed to fetch orphan orders', 'error' => $data]));
            return $response->withStatus(500)->withHeader('Content-Type', 'application/json');
        }

        // Process data for the view
        $processedData = array_map(function($order) {
            return [
                'id' => $order['id'],
                'is_deleted' => $order['is_deleted'],
                'customer_name' => $order['customers']['nama'] ?? 'N/A'
            ];
        }, $data);

        $response->getBody()->write(json_encode($processedData));
        return $response->withHeader('Content-Type', 'application/json');
    }

    public function deleteOrderApi(ServerRequestInterface $request, array $args): Response
    {
        $response = new Response();
        $orderId = (int)($args['id'] ?? 0);
        if ($orderId <= 0) {
            $response->getBody()->write(json_encode(['message' => 'Invalid Order ID']));
            return $response->withStatus(400)->withHeader('Content-Type', 'application/json');
        }

        $result = $this->devService->deleteOrderPermanently($orderId);

        if ($result->getStatus() >= 300) {
            $error = json_decode((string) $result->getBody(), true);
            $response->getBody()->write(json_encode(['message' => 'Failed to delete order', 'error' => $error]));
            return $response->withStatus(500)->withHeader('Content-Type', 'application/json');
        }

        $response->getBody()->write(json_encode(['message' => 'Order deleted successfully']));
        return $response->withHeader('Content-Type', 'application/json');
    }
} 