
export function analyticsReportRestart(success: boolean, failure: boolean) {
    // Report to google analytics. It should have been set up in index.html
    reportGoogleAnalyticsRestart(success, failure);

}

function reportGoogleAnalyticsRestart(success: boolean, failure: boolean) {
    if (success) {
        gtag('event', 'level_end',
            {'success': true,});
    }
    if (failure) {
        gtag('event', 'level_end',
            {'success': false,});
    }

    gtag('event', 'level_start');
}
