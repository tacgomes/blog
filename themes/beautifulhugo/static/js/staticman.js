// Static comments
// from: https://github.com/eduardoboucas/popcorn/blob/gh-pages/js/main.js
(function ($) {
  var $comments = $('.js-comments');

  $('.js-form').submit(function () {
    var form = this;

    $.ajax({
      type: $(this).attr('method'),
      url: $(this).attr('action'),
      data: $(this).serialize(),
      contentType: 'application/x-www-form-urlencoded',
      success: function (data) {
        showModal('Perfect!', 'Thanks for your comment! It will show on the site once it has been approved.');
      },
      error: function (err) {
        console.log(err);
        showModal('Error', 'Sorry, there was an error with the submission!');
      }
    });

    return false;
  });

  function showModal(title, message) {
    $('.modal-title').text(title);
    $('.modal-body').html(message);
    $('#staticman-modal').modal();
  }
})(jQuery);
