function success(res, data, status = 200) {
  return res.status(status).json({ success: true, data })
}

function successList(res, data, meta, status = 200) {
  return res.status(status).json({ success: true, data, meta })
}

function error(res, message, status = 500) {
  return res.status(status).json({ success: false, message })
}

module.exports = {
  success,
  successList,
  error,
}