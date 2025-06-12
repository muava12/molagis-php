<?php
declare(strict_types=1);

namespace Molagis\Shared;

use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Message\ResponseInterface;
use Twig\Environment;
use Laminas\Diactoros\Response\HtmlResponse;

/**
 * Controller untuk menangani halaman offline state
 */
class OfflineController
{
    public function __construct(
        private Environment $twig,
    ) {}

    /**
     * Menampilkan halaman offline state
     *
     * @param ServerRequestInterface $request Permintaan HTTP
     * @return ResponseInterface Respon HTML
     */
    public function showOfflinePage(ServerRequestInterface $request): ResponseInterface
    {
        $viewData = [
            'title' => 'Koneksi Terputus',
            'message' => 'Sepertinya koneksi internet Anda sedang bermasalah. Silakan periksa koneksi dan coba lagi.'
        ];

        $html = $this->twig->render('offline.html.twig', $viewData);
        return new HtmlResponse($html);
    }

    /**
     * Endpoint untuk mendapatkan template offline via AJAX
     *
     * @param ServerRequestInterface $request Permintaan HTTP
     * @return ResponseInterface Respon HTML template
     */
    public function getOfflineTemplate(ServerRequestInterface $request): ResponseInterface
    {
        $viewData = [
            'title' => 'Koneksi Terputus',
            'message' => 'Sepertinya koneksi internet Anda sedang bermasalah. Silakan periksa koneksi dan coba lagi.'
        ];

        $html = $this->twig->render('offline.html.twig', $viewData);
        return new HtmlResponse($html);
    }

    /**
     * Endpoint ping untuk cek koneksi
     *
     * @param ServerRequestInterface $request Permintaan HTTP
     * @return ResponseInterface Respon JSON
     */
    public function ping(ServerRequestInterface $request): ResponseInterface
    {
        return new \Laminas\Diactoros\Response\JsonResponse([
            'status' => 'ok',
            'timestamp' => time()
        ]);
    }
}