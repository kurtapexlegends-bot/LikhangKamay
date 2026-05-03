<?php
$req = Illuminate\Http\Request::create('/admin/users/4/impersonate', 'POST');
$res = app()->handle($req);
echo "STATUS CODE: " . $res->getStatusCode() . "\n";
if ($res->getStatusCode() === 404) {
    echo "CONTENT: " . substr($res->getContent(), 0, 500);
}
